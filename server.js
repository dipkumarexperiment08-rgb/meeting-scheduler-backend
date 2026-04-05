import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import 'express-async-errors'
import connectDB from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import meetingRoutes from './routes/meetingRoutes.js'

dotenv.config()
connectDB()

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/meetings', meetingRoutes)

app.get('/', (req, res) => res.send('Meeting Scheduler API running'))

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`)
})