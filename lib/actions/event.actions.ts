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
 * The function `getCategoryByName` is an asynchronous function that retrieves a category by its name
 * using a case-insensitive regular expression search.
 * @param {string} name - A string representing the name of the category to search for.
 * @returns The function `getCategoryByName` is returning a promise that resolves to the result of the
 * `findOne` method call on the `Category` model. The `findOne` method is searching for a category with
 * a name that matches the provided `name` parameter using a case-insensitive regular expression.
 */
const getCategoryByName = async (name: string) => {
    return Category.findOne({ name: { $regex: name, $options: 'i' } })
}

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

/**
 * The function `getAllEvents` retrieves a list of events based on the provided parameters, including a
 * search query, pagination settings, and category.
 * @param {GetAllEventsParams}  - - `query`: A string used to search for events by title. If provided,
 * only events with titles that match the query will be returned.
 * @returns an object with two properties: "data" and "totalPages". The "data" property contains an
 * array of events, and the "totalPages" property contains the total number of pages based on the limit
 * and the number of events.
 */
export async function getAllEvents({ query, limit = 6, page, category }: GetAllEventsParams) {
    try {
        await connectToDatabase()

        const titleCondition = query ? { title: { $regex: query, $options: 'i' } } : {}
        const categoryCondition = category ? await getCategoryByName(category) : null
        const conditions = {
            $and: [titleCondition, categoryCondition ? { category: categoryCondition._id } : {}],
        }

        const skipAmount = (Number(page) - 1) * limit
        const eventsQuery = Event.find(conditions)
            .sort({ createdAt: 'desc' })
            .skip(skipAmount)
            .limit(limit)

        const events = await populateEvent(eventsQuery)
        const eventsCount = await Event.countDocuments(conditions)

        return {
            data: JSON.parse(JSON.stringify(events)),
            totalPages: Math.ceil(eventsCount / limit),
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

/**
 * The function `updateEvent` updates an event in the database if the user is authorized and the event
 * exists, and then revalidates a specified path.
 * @param {UpdateEventParams}  - - `userId`: The ID of the user who is updating the event.
 * @returns the updated event as a JSON object.
 */
export async function updateEvent({ userId, event, path }: UpdateEventParams) {
    try {
        await connectToDatabase()

        const eventToUpdate = await Event.findById(event._id)
        if (!eventToUpdate || eventToUpdate.organizer.toHexString() !== userId) {
            throw new Error('Unauthorized or event not found')
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            event._id,
            { ...event, category: event.categoryId },
            { new: true }
        )
        revalidatePath(path)

        return JSON.parse(JSON.stringify(updatedEvent))
    } catch (error) {
        handleError(error)
    }
}

/**
 * The function `getRelatedEventsByCategory` retrieves related events based on a category and event ID,
 * with optional pagination.
 * @param {GetRelatedEventsByCategoryParams}  - - `categoryId`: The ID of the category for which
 * related events are to be fetched.
 * @returns an object with two properties: "data" and "totalPages". The "data" property contains an
 * array of events, and the "totalPages" property contains the total number of pages based on the given
 * limit.
 */
export async function getRelatedEventsByCategory({
    categoryId,
    eventId,
    limit = 3,
    page = 1,
}: GetRelatedEventsByCategoryParams) {
    try {
        await connectToDatabase()

        const skipAmount = (Number(page) - 1) * limit
        const conditions = { $and: [{ category: categoryId }, { _id: { $ne: eventId } }] }

        const eventsQuery = Event.find(conditions)
            .sort({ createdAt: 'desc' })
            .skip(skipAmount)
            .limit(limit)

        const events = await populateEvent(eventsQuery)
        const eventsCount = await Event.countDocuments(conditions)

        return { data: JSON.parse(JSON.stringify(events)), totalPages: Math.ceil(eventsCount / limit) }
    } catch (error) {
        handleError(error)
    }
}

/**
 * The function `getEventsByUser` retrieves events organized by a specific user, with pagination
 * support.
 * @param {GetEventsByUserParams}  - - `userId`: The ID of the user for whom we want to retrieve
 * events.
 * @returns an object with two properties: "data" and "totalPages". The "data" property contains an
 * array of events, and the "totalPages" property contains the total number of pages based on the limit
 * and the number of events.
 */
export async function getEventsByUser({ userId, limit = 6, page }: GetEventsByUserParams) {
    try {
        await connectToDatabase()

        const conditions = { organizer: userId }
        const skipAmount = (page - 1) * limit

        const eventsQuery = Event.find(conditions)
            .sort({ createdAt: 'desc' })
            .skip(skipAmount)
            .limit(limit)

        const events = await populateEvent(eventsQuery)
        const eventsCount = await Event.countDocuments(conditions)

        return { data: JSON.parse(JSON.stringify(events)), totalPages: Math.ceil(eventsCount / limit) }
    } catch (error) {
        handleError(error)
    }
}