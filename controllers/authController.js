const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utels/catchAsync');
const User = require('./../models/userModels');
const AppError = require('./../utels/appError');
const appError = require('./../utels/appError');
const Email = require('./../utels/email');
const { resolveSoa } = require('dns');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  // remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
    photo: req.body.photo,
    // passwordResetToken: req.body.passwordResetToken,
    // passwordResetExpire: req.body.passwordResetExpire,
    // active,
  });
  const url = `${req.protocol}://${req.get('host')}/Me#`;
  // console.log(url);
  await new Email(newUser,url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) email and password exist
  if (!email || !password) {
    return next(new appError('please provide email and password', 400));
  }

  //2) check if user exist && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new appError('incorrect email or password', 401));
  }

  // 3)if everything is ok , send token to client
  createSendToken(user, 201, res);
});

exports.logout = (req,res) =>{
  res.cookie('jwt','loggedout', {
    
    expires: new Date(Date.now()+ 30),
    httpOnly:true
  })
  res.status(200).json({status:'success'})
}

exports.protect = catchAsync(async (req, res, next) => {
  // 1) getting then token and check if it is there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }else if(req.cookies.jwt){
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('you are not logged in please login to get access', 401)
    );
  }

  // 2) validate the token (verification)
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) check if user still exist
  const currentUser = await User.findById(decode.id);
  if (!currentUser) {
    return next(
      new appError('The user belonging to this token no longer Exist ', 401)
    );
  }

  // 4) Check if user change password after the token was issued
  if (currentUser.changedPasswordAfter(decode.iat)) {
    return next(
      new appError('User recently changed password: please login again', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not ahve the permission to perform this action',
          403
        )
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new appError('there is no user with that email address', 404));
  }

  // 2) generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) send it to users email
 

  
  try {
    // await Email({
    //   email: user.email,
    //   subject: 'Reset password token. { valid for 10 min)',
    //   message,
    // });
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user,resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'token send to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passswordResetExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new appError('There was a error sending the email, Try again later', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpire: { $gt: Date.now() },
  });

  // 2) if the token is not expired, and there is user ,set the new password
  if (!user) {
    return next(new appError('token is invalid or has expires', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetExpire = undefined;
  user.passwordResetToken = undefined;
  await user.save();

  // 3) update changePasswordAt property for the user
  // done in the models folder with a middleware function

  // 4) Log the User in, send jwt
  createSendToken(user, 201, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from the collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) check if the posted password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new appError('password is not correct', 401));
  }

  // 3)if so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4)log user in send jwt
  createSendToken(user, 201, res);
});

// Only for rendered pages ,  no errors
exports.isLoggedIn = async (req, res, next) => {
  try{
    // 1) getting then token and check if it is there
    if(req.cookies.jwt){

      // 2) validate the token (verification)
      const decode = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

      // 3) check if user still exist
      const currentUser = await User.findById(decode.id);
      if (!currentUser) {
        return next();
      }

      // 4) Check if user change password after the token was issued
      if (currentUser.changedPasswordAfter(decode.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      
      return next();
    }
  }catch{
  return next();
  }
  next();
};

