const { json } = require('express');
const AppError = require('../utels/appError');
const Review = require('./../models/reviewModel');
// const APIFeatures = require('./../utels/apiFeatures');
// const catchAsync = require('./../utels/catchAsync');
const factory = require('./handlerFactory');

exports.setTourAndUserId = (req, res, next) => {
  // ALLOW NESTED ROUTES
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);

// exports.getReview = catchAsync(async (req,res,next) => {
//     const reviews  = await Review.find(req.body.id);

//     res.status(200).json({
//         status: 'sucess',
//         results: this.getAllReviews.length(),
//         data: {
//             reviews,
//         }
//     })
// })
