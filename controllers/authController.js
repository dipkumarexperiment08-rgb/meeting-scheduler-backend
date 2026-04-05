import User from '../models/User.js'
import generateOTP from '../utils/generateOTP.js'
import generateToken from '../utils/generateToken.js'
import sendEmail from '../utils/sendEmail.js'
import sendSMS from '../utils/sendSMS.js'

// @desc    Register user
// @route   POST /api/auth/register
export const register = async (req, res) => {
  const { name, email, password, phone } = req.body

  const userExists = await User.findOne({ email })
  if (userExists) {
    return res.status(400).json({ message: 'Email already registered' })
  }

  const otp = generateOTP()
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 mins

  const user = await User.create({
    name,
    email,
    password,
    phone,
    otp: { code: otp, expiresAt: otpExpiry },
  })

  // Send OTP email
  await sendEmail({
    to: email,
    subject: 'Verify your email - Meeting Scheduler',
    html: `<h2>Your OTP is: <strong>${otp}</strong></h2><p>Valid for 10 minutes.</p>`,
  })

// Send OTP SMS if phone provided (skip if Twilio not configured)
  if (phone && process.env.TWILIO_ACCOUNT_SID?.startsWith('AC')) {
    await sendSMS(phone, `Your Meeting Scheduler OTP is: ${otp}`)
  }

  res.status(201).json({
    message: 'Registered successfully. Please verify your OTP.',
    userId: user._id,
  })
}

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
export const verifyOTP = async (req, res) => {
  const { userId, otp } = req.body

  const user = await User.findById(userId)
  if (!user) return res.status(404).json({ message: 'User not found' })

  if (user.otp.code !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' })
  }

  if (user.otp.expiresAt < new Date()) {
    return res.status(400).json({ message: 'OTP expired' })
  }

  user.isVerified = true
  user.otp = { code: null, expiresAt: null }
  await user.save()

  const token = generateToken(user._id)

  res.json({ message: 'Email verified successfully', token })
}

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res) => {
  const { email, password, rememberMe } = req.body

  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })

  if (!user.isVerified) {
    return res.status(401).json({ message: 'Please verify your email first' })
  }

  const isMatch = await user.matchPassword(password)
  if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' })

  const token = generateToken(user._id, rememberMe)

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
  })
}

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  const { email } = req.body

  const user = await User.findOne({ email })
  if (!user) return res.status(404).json({ message: 'Email not found' })

  const otp = generateOTP()
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000)

  user.otp = { code: otp, expiresAt: otpExpiry }
  await user.save()

  await sendEmail({
    to: email,
    subject: 'Reset your password - Meeting Scheduler',
    html: `<h2>Your password reset OTP is: <strong>${otp}</strong></h2><p>Valid for 10 minutes.</p>`,
  })

  res.json({ message: 'OTP sent to your email', userId: user._id })
}

// @desc    Reset password
// @route   POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  const { userId, otp, newPassword } = req.body

  const user = await User.findById(userId)
  if (!user) return res.status(404).json({ message: 'User not found' })

  if (user.otp.code !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' })
  }

  if (user.otp.expiresAt < new Date()) {
    return res.status(400).json({ message: 'OTP expired' })
  }

  user.password = newPassword
  user.otp = { code: null, expiresAt: null }
  await user.save()

  res.json({ message: 'Password reset successfully' })
}