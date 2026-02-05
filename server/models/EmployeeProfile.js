const mongoose = require('mongoose');

const employeeDocumentSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    fileType: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const employeeProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected'],
      default: 'draft',
    },

    dateOfApplication: { type: Date },
    applicationReferenceNo: { type: String, trim: true },

    personal: {
      fullName: { type: String, trim: true },
      guardianName: { type: String, trim: true },
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
      nationality: { type: String, trim: true },
      maritalStatus: { type: String, enum: ['single', 'married', ''], default: '' },
      email: { type: String, trim: true, lowercase: true },
      mobileNumber: { type: String, trim: true },
      emergencyPhone: { type: String, trim: true },
      emergencyContactNumber: { type: String, trim: true },
      currentResidentialAddress: { type: String, trim: true },
    },

    identification: {
      idType: { type: String, enum: ['nationalid', 'passport', 'other', ''], default: '' },
      idNumber: { type: String, trim: true },
      numberType: { type: String, enum: ['social_security', 'tax_id', 'iem', ''], default: '' },
      numberValue: { type: String, trim: true },
    },

    constructionExperience: {
      hasPreviousExperience: { type: Boolean, default: false },
      roles: {
        generalLabor: { type: Boolean, default: false },
        masonHelper: { type: Boolean, default: false },
        carpenterHelper: { type: Boolean, default: false },
        steelRebarHelper: { type: Boolean, default: false },
        electricalHelper: { type: Boolean, default: false },
        plumbingHelper: { type: Boolean, default: false },
        equipmentToolOperator: { type: Boolean, default: false },
        siteCleaner: { type: Boolean, default: false },
        other: { type: String, trim: true },
      },
      yearsOfExperience: { type: String, trim: true },
      lastCompanyOrProjectName: { type: String, trim: true },
    },

    skills: {
      materialHandlingLifting: { type: Boolean, default: false },
      concreteMixing: { type: Boolean, default: false },
      basicToolHandling: { type: Boolean, default: false },
      painting: { type: Boolean, default: false },
      drywall: { type: Boolean, default: false },
      finishing: { type: Boolean, default: false },
      siteCleaningMaintenance: { type: Boolean, default: false },
      scaffoldingAssistance: { type: Boolean, default: false },
      canFollowSafetyInstructions: { type: Boolean, default: false },
      otherSkills: { type: String, trim: true },
    },

    availability: {
      availableToStartFrom: { type: Date },
      preferredWorkType: {
        type: String,
        enum: ['daily_wage', 'weekly', 'monthly', 'contract', ''],
        default: '',
      },
      willingToWorkOvertime: { type: Boolean, default: false },
      willingToWorkAtDifferentJobSites: { type: Boolean, default: false },
    },

    healthSafety: {
      anyMedicalConditionAffectingWork: { type: Boolean, default: false },
      medicalConditionDetails: { type: String, trim: true },
    },

    declaration: {
      applicantSignatureName: { type: String, trim: true },
      signatureDataUrl: { type: String, trim: true },
      date: { type: Date },
    },

    officeUse: {
      formReceivedBy: { type: String, trim: true },
      remarks: { type: String, trim: true },
    },

    documents: [employeeDocumentSchema],

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String, trim: true },

    deleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

employeeProfileSchema.pre(/^find/, function (next) {
  const opts = this.getOptions ? this.getOptions() : {};
  if (!opts?.includeDeleted) {
    this.where({ deleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.models.EmployeeProfile || mongoose.model('EmployeeProfile', employeeProfileSchema);
