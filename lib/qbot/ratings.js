'use strict';

/**
 * Manages the ratings for all users.
 * Each rating has a time stamp associated with it to allow the bot to decide
 * when a new rating should be computed.
 */
class Ratings {
    constructor() {
        this.ratingMap = new Map();
    }

    /**
     * Clears all ratings currently contained within the Ratings object.
     */
    reset() {
        this.ratingMap.clear();
    }

    /**
     * Retrieves the current rating for the specified user.
     * @param userId The UserId for the user whose rating is to be retrieved.
     * @returns {*} The rating of the specified user, if none has been generated this method returns undefined.
     */
    getRating(userId) {
        return this.ratingMap.get(userId);
    }

    /**
     * Computes a new rating for the specified user.
     * @param userId The UserId for the user whose rating is to be created.
     */
    createRating(userId) {
        const rating = { value: Math.floor( Math.random() * 5 ), time: Date.now() };

        this.ratingMap.set(userId, rating);

        return rating;
    }
}

module.exports = Ratings;
