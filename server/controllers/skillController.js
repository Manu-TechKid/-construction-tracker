const Skill = require('../models/skillModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createSkill = catchAsync(async (req, res, next) => {
  const skill = await Skill.create(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      skill,
    },
  });
});

exports.getAllSkills = catchAsync(async (req, res, next) => {
  const skills = await Skill.find();
  res.status(200).json({
    status: 'success',
    results: skills.length,
    data: {
      skills,
    },
  });
});

exports.getSkill = catchAsync(async (req, res, next) => {
  const skill = await Skill.findById(req.params.id);
  if (!skill) {
    return next(new AppError('No skill found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      skill,
    },
  });
});

exports.updateSkill = catchAsync(async (req, res, next) => {
  const skill = await Skill.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!skill) {
    return next(new AppError('No skill found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      skill,
    },
  });
});

exports.deleteSkill = catchAsync(async (req, res, next) => {
  const skill = await Skill.findByIdAndDelete(req.params.id);
  if (!skill) {
    return next(new AppError('No skill found with that ID', 404));
  }
  res.status(204).json({
    status: 'success',
    data: null,
  });
});
