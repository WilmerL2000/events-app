"use server"

import { CreateCategoryParams } from "@/types"
import { handleError } from "../utils"
import { connectToDatabase } from "../database"
import Category from "../database/models/category.model"

/**
 * The function creates a new category in a database and returns the created category as a JSON object.
 * @param {CreateCategoryParams}  - - `categoryName`: The name of the category to be created.
 * @returns a new category object that has been created in the database.
 */
export const createCategory = async ({ categoryName }: CreateCategoryParams) => {
    try {
        await connectToDatabase();

        const newCategory = await Category.create({ name: categoryName });

        return JSON.parse(JSON.stringify(newCategory));
    } catch (error) {
        handleError(error)
    }
}

/**
 * The function `getAllCategories` retrieves all categories from a database and returns them as a JSON
 * object.
 * @returns an array of categories.
 */
export const getAllCategories = async () => {
    try {
        await connectToDatabase();

        const categories = await Category.find();

        return JSON.parse(JSON.stringify(categories));
    } catch (error) {
        handleError(error)
    }
}