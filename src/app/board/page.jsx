'use client'
import { useEffect, useRef, useState } from 'react'
import supabase from '@/utils/supabase/client'
import { useUser } from '@/components/UserContext'
import { MousePointer2 } from 'lucide-react'

const generateRandomColor = () =>
  `hsl(${Math.floor(Math.random() * 360)}, 100%, 70%)`

const Page = () => {
  const [cursors, setCursors] = useState({}) // Track other users' cursors
  const userColorRef = useRef(generateRandomColor())
  const userRef = useRef(null)

  const channelRef = useRef(null) // Ref for the Supabase channel

  userRef.current = useUser()

  const EVENT_NAME = 'cursor-move'

  const handleMouseMove = event => {
    const { clientX, clientY } = event

    const user = userRef.current

    // Broadcast the current user's cursor position
    channelRef.current.send({
      type: 'broadcast',
      event: EVENT_NAME,
      payload: {
        color: userColorRef.current,
        position: {
          x: clientX,
          y: clientY,
        },
        user: {
          id: user.id,
          name: user.user_metadata.name,
        },
      },
    })
  }

  useEffect(() => {
    // Add event listener for mousemove
    window.addEventListener('mousemove', handleMouseMove)

    // Cleanup on unmount
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  useEffect(() => {
    // Create the broadcast channel
    const channel = supabase.channel('cursor-board')

    // Listen for broadcast messages
    channel.on('broadcast', { event: EVENT_NAME }, data => {
      const { payload } = data
      const { user, position, color } = payload

      setCursors(prev => ({
        ...prev,
        [user.id]: { ...position, name: user.name, color },
      }))
    })

    // Subscribe to the channel
    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to cursor board channel')
      }
    })

    channelRef.current = channel

    // Cleanup on unmount
    return () => {
      channel.unsubscribe()
    }
  }, [])

  return (
    <div className='max-w-screen max-h-screen overflow-hidden bg-red-900'>
      {Object.keys(cursors).map(id => (
        <div
          key={id}
          className='absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all'
          style={{
            top: cursors[id].y,
            left: cursors[id].x,
          }}
        >
          <MousePointer2
            color={cursors[id].color}
            fill={cursors[id].color}
            size={30}
          />

          <div
            className='mt-1 px-2 py-1 rounded text-xs font-bold text-white text-center'
            style={{
              backgroundColor: cursors[id].color,
            }}
          >
            {cursors[id].name}
          </div>
        </div>
      ))}
    </div>
  )
}
export default Page