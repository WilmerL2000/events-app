'use server'

import { revalidatePath } from 'next/cache'

import { connectToDatabase } from '@/lib/database'
import Event from '@/lib/database/models/event.model'
import User from '@/lib/database/models/user.model'
import Category from '@/lib/database/models/category.model'
import { handleError } from '@/lib/utils'

import {
    CreateEventParams,
    UpdateEventParams,
    DeleteEventParams,
    GetAllEventsParams,
    GetEventsByUserParams,
    GetRelatedEventsByCategoryParams,
} from '@/types'

/**
 * The function creates a new event, associates it with an organizer, and updates a specified path.
 * @param {CreateEventParams}  - - `userId`: The ID of the user creating the event.
 * @returns the newly created event as a JSON object.
 */
export async function createEvent({ userId, event, path }: CreateEventParams) {
    try {
        await connectToDatabase()

        console.log({ category: event.categoryId })

        const organizer = await User.findById(userId)
        if (!organizer) throw new Error('Organizer not found')

        const newEvent = await Event.create({ ...event, category: event.categoryId, organizer: userId })
        revalidatePath(path)

        return JSON.parse(JSON.stringify(newEvent))
    } catch (error) {
        handleError(error)
    }
}