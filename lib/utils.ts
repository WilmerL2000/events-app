import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import qs from 'query-string'

import { UrlQueryParams, RemoveUrlQueryParams } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const handleError = (error: unknown) => {
  console.error(error)
  throw new Error(typeof error === 'string' ? error : JSON.stringify(error))
}

/**
 * The `formatDateTime` function takes a `Date` object as input and returns an object with formatted
 * date and time strings in different formats.
 * @param {Date} dateString - The `dateString` parameter is a string representation of a date. It can
 * be in any valid date format that can be parsed by the `Date` constructor, such as "2022-10-25" or
 * "October 25, 2022".
 * @returns The function `formatDateTime` returns an object with three properties: `dateTime`,
 * `dateOnly`, and `timeOnly`. Each property contains a formatted string representing the date and time
 * in different formats.
 */
export const formatDateTime = (dateString: Date) => {
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short', // abbreviated weekday name (e.g., 'Mon')
    month: 'short', // abbreviated month name (e.g., 'Oct')
    day: 'numeric', // numeric day of the month (e.g., '25')
    hour: 'numeric', // numeric hour (e.g., '8')
    minute: 'numeric', // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short', // abbreviated weekday name (e.g., 'Mon')
    month: 'short', // abbreviated month name (e.g., 'Oct')
    year: 'numeric', // numeric year (e.g., '2023')
    day: 'numeric', // numeric day of the month (e.g., '25')
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric', // numeric hour (e.g., '8')
    minute: 'numeric', // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
  }

  const formattedDateTime: string = new Date(dateString).toLocaleString('en-US', dateTimeOptions)

  const formattedDate: string = new Date(dateString).toLocaleString('en-US', dateOptions)

  const formattedTime: string = new Date(dateString).toLocaleString('en-US', timeOptions)

  return {
    dateTime: formattedDateTime,
    dateOnly: formattedDate,
    timeOnly: formattedTime,
  }
}

/**
 * The above code exports two functions, `convertFileToUrl` which converts a `File` object to a URL,
 * and `formatPrice` which formats a string as a currency amount in USD.
 * @param {File} file - A File object, which represents a file selected by the user through an input
 * element of type "file".
 */
export const convertFileToUrl = (file: File) => URL.createObjectURL(file)

export const formatPrice = (price: string) => {
  const amount = parseFloat(price)
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)

  return formattedPrice
}

/**
 * The function `formUrlQuery` takes in URL query parameters and returns a new URL with the specified
 * key-value pair added to the query string.
 * @param {UrlQueryParams}  - - `params`: A string representing the current URL query parameters.
 * @returns a URL query string with the updated key-value pair.
 */
export function formUrlQuery({ params, key, value }: UrlQueryParams) {
  const currentUrl = qs.parse(params)

  currentUrl[key] = value

  return qs.stringifyUrl(
    {
      url: window.location.pathname,
      query: currentUrl,
    },
    { skipNull: true }
  )
}

/**
 * The function removes specified keys from a URL query string and returns the updated URL.
 * @param {RemoveUrlQueryParams}  - - `params`: This is an object representing the current URL query
 * parameters. It is expected to be in the format of a query string, such as `key1=value1&key2=value2`.
 * @returns a string that represents the updated URL query parameters after removing the specified
 * keys.
 */
export function removeKeysFromQuery({ params, keysToRemove }: RemoveUrlQueryParams) {
  const currentUrl = qs.parse(params)

  keysToRemove.forEach(key => {
    delete currentUrl[key]
  })

  return qs.stringifyUrl(
    {
      url: window.location.pathname,
      query: currentUrl,
    },
    { skipNull: true }
  )
}