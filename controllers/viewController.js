const Tour = require('./../models/tourModels');
const User = require('./../models/userModels');
const Booking = require('./../models/bookingModel')
const catchAsync = require('./../utels/catchAsync');
const AppError = require('./../utels/appError');
const { nextTick } = require('process');

exports.getOverview = catchAsync(async (req,res) => {
    // get tour data from the collection
    const tours = await Tour.find();
    // const x = tours.length;
    // console.log(x);
    // Build template

    // render that template

    res.status(200).render('overview', {
      title:'All Tours',
      tours,
    });
  });

exports.getTour = catchAsync(async (req,res,next) => {

    // 1) Get the data for the requested tour (including reviews and guides)
    const tour = await Tour.findOne({slug: req.params.slug}).populate({
        path: 'reviews',
        fields: 'review rating user'
    }); 
    
    if(!tour){
      return next( new AppError('No tour found with that name', 404))
    }

    // 2)Build template 

    // 3) render template with the data


    res.status(200).render('tour', {
      title:`${tour.name} Tour`,
      tour
    });
  });

exports.getLoginForm = (req,res) => {
  res.status(200).render('login', {
    title: 'Log into your account'
  })
}

exports.getAccount = (req,res) => {
  res.status(200).render('account',{
    title: 'Your Account'
  })
}

exports.getMyTours = catchAsync( async(req,res,next) => {
  // 1) FIND ALL BOOKINGS
  const bookings = await Booking.find({user: req.user.id});

  // 2) FIND TOURS WITH THE RETURNED IDs
  const tourIDs = bookings.map(el => el.tour)
  const tours = await Tour.find({_id: {$in: tourIDs}})

  res.status(200).render('overview' , {
    title: 'My Tours',
    tours
  })
  next();
})

exports.updateUserData = catchAsync(async(req,res, next) => {
  const updatedUser = await User.findByIdAndUpdate(req.user.id, {
    name: req.body.name,
    email: req.body.email
  },
  {
    new: true,
    runValidators:true
  }
  );

  res.status(200).render('account',{
    title: 'Your Account',
    user: updatedUser
  })

  next();
})