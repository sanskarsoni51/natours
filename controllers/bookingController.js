const Tour = require('./../models/tourModels');
const catchAsync = require('./../utels/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utels/appError');
const Booking = require('../models/bookingModel');

exports.getCheckoutSession = (req,res,next) => {

    return 1;
};


exports.getAllBookings = factory.getAll(Booking);


exports.createBooking = factory.createOne(Booking);


exports.getBooking = factory.getOne(Booking);


exports.updateBooking = factory.updateOne(Booking);


exports.deleteBooking = factory.deleteOne(Booking);