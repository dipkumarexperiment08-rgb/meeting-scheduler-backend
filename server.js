import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import 'express-async-errors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import connectDB from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import meetingRoutes from './routes/meetingRoutes.js'

dotenv.config()
connectDB()

const app = express()
const httpServer = createServer(app)

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('join', (userId) => {
    socket.join(userId)
    console.log(`User ${userId} joined their room`)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/meetings', meetingRoutes)

app.get('/', (req, res) => res.send('Meeting Scheduler API running'))

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  })
})

httpServer.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`)
})