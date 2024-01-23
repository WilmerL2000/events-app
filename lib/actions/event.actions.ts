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
 * The function `populateEvent` populates the `organizer` and `category` fields of a query with
 * additional information from the `User` and `Category` models.
 * @param {any} query - The `query` parameter is an object that represents a query to be executed on a
 * database. It is used to populate the fields of an event object with additional information from
 * related models.
 * @returns The function `populateEvent` is returning the result of the `query.populate` method, which
 * is a modified query object with the specified population options.
 */
const populateEvent = (query: any) => {
    return query
        .populate({ path: 'organizer', model: User, select: '_id firstName lastName' })
        .populate({ path: 'category', model: Category, select: '_id name' })
}

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

/**
 * The function `getEventById` retrieves an event from a database by its ID and returns it as a JSON
 * object.
 * @param {string} eventId - The `eventId` parameter is a string that represents the unique identifier
 * of the event that we want to retrieve.
 * @returns a Promise that resolves to the event object with the specified eventId.
 */
export async function getEventById(eventId: string) {
    try {
        await connectToDatabase()

        const event = await populateEvent(Event.findById(eventId))

        if (!event) throw new Error('Event not found')

        return JSON.parse(JSON.stringify(event))
    } catch (error) {
        handleError(error)
    }
}

export async function getAllEvents({ query, limit = 6, page, category }: GetAllEventsParams) {
    try {
        await connectToDatabase()

        const conditions = {}

        const eventsQuery = Event.find(conditions)
            .sort({ createdAt: 'desc' })
            .skip(0)
            .limit(limit)

        const events = await populateEvent(eventsQuery)
        const eventsCount = await Event.countDocuments(conditions)

        return {
            data: JSON.parse(JSON.stringify(events)),
            totalPages: Math.ceil(eventsCount / limit)
        }
    } catch (error) {
        handleError(error)
    }
}

/**
 * The function deletes an event from the database and revalidates a given path if the event was
 * successfully deleted.
 * @param {DeleteEventParams}  - - `eventId`: The ID of the event to be deleted.
 */
export async function deleteEvent({ eventId, path }: DeleteEventParams) {
    try {
        await connectToDatabase()

        const deletedEvent = await Event.findByIdAndDelete(eventId)
        if (deletedEvent) revalidatePath(path)
    } catch (error) {
        handleError(error)
    }
}