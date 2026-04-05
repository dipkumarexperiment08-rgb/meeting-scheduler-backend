import express from 'express'
import {
  createMeeting,
  getMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  updateRSVP,
} from '../controllers/meetingController.js'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(protect)

router.route('/')
  .get(getMeetings)
  .post(createMeeting)

router.route('/:id')
  .get(getMeeting)
  .put(updateMeeting)
  .delete(deleteMeeting)

router.put('/:id/rsvp', updateRSVP)

export default router