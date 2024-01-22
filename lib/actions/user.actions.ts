'use server'

import { revalidatePath } from 'next/cache'

import { CreateUserParams, UpdateUserParams } from '@/types'
import { connectToDatabase } from '@/lib/database'
import User from '@/lib/database/models/user.model'
import Order from '@/lib/database/models/order.model'
import Event from '@/lib/database/models/event.model'

import { handleError } from '@/lib/utils'

/**
 * The above function creates a new user in a database using the provided user parameters.
 * @param {CreateUserParams} user - The `user` parameter is an object that contains the information
 * needed to create a new user. It should have the following properties:
 * @returns a JSON object representing the newly created user.
 */
export async function createUser(user: CreateUserParams) {
    try {
        await connectToDatabase()

        const newUser = await User.create(user)
        return JSON.parse(JSON.stringify(newUser))
    } catch (error) {
        handleError(error)
    }
}

/**
 * The function `getUserById` retrieves a user from the database by their ID and returns it as a JSON
 * object.
 * @param {string} userId - The `userId` parameter is a string that represents the unique identifier of
 * a user.
 * @returns a Promise that resolves to the user object with the specified userId.
 */
export async function getUserById(userId: string) {
    try {
        await connectToDatabase()

        const user = await User.findById(userId)

        if (!user) throw new Error('User not found')
        return JSON.parse(JSON.stringify(user))
    } catch (error) {
        handleError(error)
    }
}

/**
 * The function `updateUser` updates a user in the database based on their clerkId.
 * @param {string} clerkId - The clerkId parameter is a string that represents the unique identifier of
 * the user you want to update.
 * @param {UpdateUserParams} user - The `user` parameter is an object that contains the updated
 * information for the user. It should have the following properties:
 * @returns the updated user object as a JSON string.
 */
export async function updateUser(clerkId: string, user: UpdateUserParams) {
    try {
        await connectToDatabase()

        const updatedUser = await User.findOneAndUpdate({ clerkId }, user, { new: true })

        if (!updatedUser) throw new Error('User update failed')
        return JSON.parse(JSON.stringify(updatedUser))
    } catch (error) {
        handleError(error)
    }
}

/**
 * The above function is an asynchronous function in TypeScript that deletes a user from a database,
 * along with unlinking relationships and updating other collections.
 * @param {string} clerkId - The `clerkId` parameter is a string that represents the unique identifier
 * of the user to be deleted.
 * @returns the deleted user object as a JSON string if the user is found and deleted successfully. If
 * the user is not found, it will return null.
 */
export async function deleteUser(clerkId: string) {
    try {
        await connectToDatabase()

        // Find user to delete
        const userToDelete = await User.findOne({ clerkId })

        if (!userToDelete) {
            throw new Error('User not found')
        }

        // Unlink relationships
        await Promise.all([
            // Update the 'events' collection to remove references to the user
            Event.updateMany(
                { _id: { $in: userToDelete.events } },
                { $pull: { organizer: userToDelete._id } }
            ),

            // Update the 'orders' collection to remove references to the user
            Order.updateMany({ _id: { $in: userToDelete.orders } }, { $unset: { buyer: 1 } }),
        ])

        // Delete user
        const deletedUser = await User.findByIdAndDelete(userToDelete._id)
        revalidatePath('/')

        return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null
    } catch (error) {
        handleError(error)
    }
}