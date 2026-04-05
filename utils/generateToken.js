import jwt from 'jsonwebtoken'

const generateToken = (userId, rememberMe = false) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: rememberMe ? '30d' : '7d' }
  )
}

export default generateToken