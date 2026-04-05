import Meeting from '../models/Meeting.js'
import sendEmail from '../utils/sendEmail.js'

// @desc   Create meeting
// @route  POST /api/meetings
export const createMeeting = async (req, res) => {
  const { title, description, location, date, startTime, endTime, color, guests } = req.body

  // Check for conflicts
  const conflict = await Meeting.findOne({
    organizer: req.user._id,
    date: new Date(date),
    status: { $ne: 'cancelled' },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
    ],
  })

  if (conflict) {
    return res.status(400).json({
      message: `Conflict with existing meeting: "${conflict.title}" at ${conflict.startTime} - ${conflict.endTime}`,
    })
  }

  const meeting = await Meeting.create({
    title,
    description,
    location,
    date: new Date(date),
    startTime,
    endTime,
    color,
    organizer: req.user._id,
    guests: guests?.map((email) => ({ email })) || [],
  })

  // Send invite emails to guests
  if (guests && guests.length > 0) {
    for (const email of guests) {
      await sendEmail({
        to: email,
        subject: `Meeting Invitation: ${title}`,
        html: `
          <h2>You've been invited to a meeting!</h2>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Date:</strong> ${new Date(date).toDateString()}</p>
          <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
          <p><strong>Location:</strong> ${location || 'Not specified'}</p>
          <p><strong>Description:</strong> ${description || 'No description'}</p>
        `,
      })
    }
  }

  res.status(201).json(meeting)
}

// @desc   Get all meetings for logged in user
// @route  GET /api/meetings
export const getMeetings = async (req, res) => {
  const meetings = await Meeting.find({
    $or: [
      { organizer: req.user._id },
      { 'guests.email': req.user.email },
    ],
  }).sort({ date: 1 })

  res.json(meetings)
}

// @desc   Get single meeting
// @route  GET /api/meetings/:id
export const getMeeting = async (req, res) => {
  const meeting = await Meeting.findById(req.params.id).populate(
    'organizer',
    'name email'
  )

  if (!meeting) {
    return res.status(404).json({ message: 'Meeting not found' })
  }

  res.json(meeting)
}

// @desc   Update meeting
// @route  PUT /api/meetings/:id
export const updateMeeting = async (req, res) => {
  const meeting = await Meeting.findById(req.params.id)

  if (!meeting) {
    return res.status(404).json({ message: 'Meeting not found' })
  }

  if (meeting.organizer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' })
  }

  const updated = await Meeting.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  )

  res.json(updated)
}

// @desc   Delete meeting
// @route  DELETE /api/meetings/:id
export const deleteMeeting = async (req, res) => {
  const meeting = await Meeting.findById(req.params.id)

  if (!meeting) {
    return res.status(404).json({ message: 'Meeting not found' })
  }

  if (meeting.organizer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' })
  }

  await meeting.deleteOne()
  res.json({ message: 'Meeting deleted' })
}

// @desc   Update RSVP status
// @route  PUT /api/meetings/:id/rsvp
export const updateRSVP = async (req, res) => {
  const { status } = req.body
  const meeting = await Meeting.findById(req.params.id)

  if (!meeting) {
    return res.status(404).json({ message: 'Meeting not found' })
  }

  const guest = meeting.guests.find((g) => g.email === req.user.email)

  if (!guest) {
    return res.status(404).json({ message: 'You are not a guest of this meeting' })
  }

  guest.status = status
  await meeting.save()

  res.json({ message: `RSVP updated to ${status}` })
}