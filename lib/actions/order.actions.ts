"use server"

import Stripe from 'stripe';
import { CheckoutOrderParams, CreateOrderParams, GetOrdersByEventParams, GetOrdersByUserParams } from "@/types"
import { redirect } from 'next/navigation';
import { handleError } from '../utils';
import { connectToDatabase } from '../database';
import Order from '../database/models/order.model';
import Event from '../database/models/event.model';
import { ObjectId } from 'mongodb';
import User from '../database/models/user.model';

/**
 * The `checkoutOrder` function creates a Stripe checkout session for an order, including the line
 * items, metadata, success URL, and cancel URL.
 * @param {CheckoutOrderParams} order - The `order` parameter is an object that contains the following
 * properties:
 */
export const checkoutOrder = async (order: CheckoutOrderParams) => {
    try {

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

        const price = order.isFree ? 0 : Number(order.price) * 100;

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        unit_amount: price,
                        product_data: {
                            name: order.eventTitle
                        }
                    },
                    quantity: 1
                },
            ],
            metadata: {
                eventId: order.eventId,
                buyerId: order.buyerId,
            },
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/profile`,
            cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/`,
        });

        redirect(session.url!)
    } catch (error) {
        throw error;
    }
}

/**
 * The function creates a new order by connecting to a database, creating a new order object, and
 * returning the newly created order.
 * @param {CreateOrderParams} order - The `order` parameter is an object of type `CreateOrderParams`.
 * It contains the necessary information to create a new order.
 * @returns a new order object that has been created in the database.
 */
export const createOrder = async (order: CreateOrderParams) => {
    try {
        await connectToDatabase();

        const newOrder = await Order.create({
            ...order,
            event: order.eventId,
            buyer: order.buyerId,
        });

        return JSON.parse(JSON.stringify(newOrder));
    } catch (error) {
        handleError(error);
    }
}

/**
 * The function `getOrdersByEvent` retrieves orders based on a search string and event ID.
 * @param {GetOrdersByEventParams}  - - `searchString`: A string used to search for orders by the
 * buyer's name. It is case-insensitive and can be a partial match.
 * @returns the orders that match the given event ID and buyer search string. The returned orders are
 * in JSON format.
 */
export async function getOrdersByEvent({ searchString, eventId }: GetOrdersByEventParams) {
    try {
        await connectToDatabase()

        if (!eventId) throw new Error('Event ID is required')
        const eventObjectId = new ObjectId(eventId)

        const orders = await Order.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'buyer',
                    foreignField: '_id',
                    as: 'buyer',
                },
            },
            {
                $unwind: '$buyer',
            },
            {
                $lookup: {
                    from: 'events',
                    localField: 'event',
                    foreignField: '_id',
                    as: 'event',
                },
            },
            {
                $unwind: '$event',
            },
            {
                $project: {
                    _id: 1,
                    totalAmount: 1,
                    createdAt: 1,
                    eventTitle: '$event.title',
                    eventId: '$event._id',
                    buyer: {
                        $concat: ['$buyer.firstName', ' ', '$buyer.lastName'],
                    },
                },
            },
            {
                $match: {
                    $and: [{ eventId: eventObjectId }, { buyer: { $regex: RegExp(searchString, 'i') } }],
                },
            },
        ])

        return JSON.parse(JSON.stringify(orders))
    } catch (error) {
        handleError(error)
    }
}

/**
 * The function `getOrdersByUser` retrieves orders for a specific user, with options for pagination and
 * limiting the number of results.
 * @param {GetOrdersByUserParams}  - - `userId`: The ID of the user for whom to retrieve orders.
 * @returns an object with two properties: "data" and "totalPages". The "data" property contains an
 * array of orders, and the "totalPages" property contains the total number of pages based on the given
 * limit.
 */
export async function getOrdersByUser({ userId, limit = 3, page }: GetOrdersByUserParams) {
    try {
        await connectToDatabase()

        const skipAmount = (Number(page) - 1) * limit
        const conditions = { buyer: userId }

        const orders = await Order.distinct('event._id')
            .find(conditions)
            .sort({ createdAt: 'desc' })
            .skip(skipAmount)
            .limit(limit)
            .populate({
                path: 'event',
                model: Event,
                populate: {
                    path: 'organizer',
                    model: User,
                    select: '_id firstName lastName',
                },
            })

        const ordersCount = await Order.distinct('event._id').countDocuments(conditions)

        return { data: JSON.parse(JSON.stringify(orders)), totalPages: Math.ceil(ordersCount / limit) }
    } catch (error) {
        handleError(error)
    }
}