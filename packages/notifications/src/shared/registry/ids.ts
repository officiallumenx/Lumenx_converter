/** Stable template IDs — preserved from module-notifications + Nexus catalog. */
export const NOTIFICATION_TEMPLATE_IDS = {
  admissions: {
    parent: {
      applicationSubmitted: "admissions.parent.application_submitted",
      parentConfirmationRequired: "admissions.parent.parent_confirmation_required",
      applicationApproved: "admissions.parent.application_approved",
      applicationClosed: "admissions.parent.application_closed",
      waitlistJoined: "admissions.parent.waitlist_joined",
      waitlistDay80Reminder: "admissions.parent.waitlist_day80_reminder",
      waitlistReminderSent: "admissions.parent.waitlist_reminder_sent",
      waitlistRemoved: "admissions.parent.waitlist_removed",
      waitlistAutoRemoved: "admissions.parent.waitlist_auto_removed",
      seatsAvailable: "admissions.parent.seats_available",
      correctionRequested: "admissions.parent.correction_requested",
      correctionsSubmitted: "admissions.parent.corrections_submitted",
      confirmationReminderMorning: "admissions.parent.confirmation_reminder_morning",
      confirmationReminderEvening: "admissions.parent.confirmation_reminder_evening",
      statusUpdate: "admissions.parent.status_update",
      interviewScheduled: "admissions.parent.interview_scheduled",
      selected: "admissions.parent.selected",
      rejected: "admissions.parent.rejected",
      admissionCompleted: "admissions.parent.admission_completed",
      missingInformation: "admissions.parent.missing_information",
    },
  },
  attendance: {
    parent: {
      dailyAbsence: "attendance.parent.daily_absence",
      periodAbsence: "attendance.parent.period_absence",
      dailySummary: "attendance.parent.daily_summary",
      percentageWarning: "attendance.parent.percentage_warning",
    },
    student: {
      dailyAbsence: "attendance.student.daily_absence",
      periodAbsence: "attendance.student.period_absence",
      dailySummary: "attendance.student.daily_summary",
      percentageInfo: "attendance.student.percentage_info",
    },
    teacher: {
      pendingSubmit: "attendance.teacher.pending_submit",
    },
    admin: {
      pendingSubmit: "attendance.admin.pending_submit",
    },
  },
  careers: {
    student: {
      applicationSubmitted: "careers.student.application_submitted",
      shortlisted: "careers.student.shortlisted",
      interview: "careers.student.interview",
      selected: "careers.student.selected",
      rejected: "careers.student.rejected",
      onboarding: "careers.student.onboarding",
      statusUpdate: "careers.student.status_update",
    },
  },
  transport: {
    teacher: {
      routeConfirmed: "transport.teacher.route_confirmed",
      studentPickupUpdated: "transport.teacher.student_pickup_updated",
      schoolTimingNotice: "transport.teacher.school_timing_notice",
      busInspectionComplete: "transport.teacher.bus_inspection_complete",
      routeDelayReminder: "transport.teacher.route_delay_reminder",
      driverBriefing: "transport.teacher.driver_briefing",
    },
    parent: {
      delay: "transport.parent.delay",
      tripStarted: "transport.parent.trip_started",
      approach30: "transport.parent.approach_30",
      approach15: "transport.parent.approach_15",
      approach5: "transport.parent.approach_5",
      studentBoarded: "transport.parent.student_boarded",
      studentNotBoarded: "transport.parent.student_not_boarded",
      reachedSchool: "transport.parent.reached_school",
      boardingStarted: "transport.parent.boarding_started",
      studentDropped: "transport.parent.student_dropped",
      emergencySos: "transport.parent.emergency_sos",
      emergencyBreakdown: "transport.parent.emergency_breakdown",
      emergencyDelay: "transport.parent.emergency_delay",
      emergencyRouteIssue: "transport.parent.emergency_route_issue",
    },
    admin: {
      tripStarted: "transport.admin.trip_started",
      attendancePending: "transport.admin.attendance_pending",
      emergencySos: "transport.admin.emergency_sos",
      emergencyBreakdown: "transport.admin.emergency_breakdown",
      emergencyDelay: "transport.admin.emergency_delay",
      emergencyRouteIssue: "transport.admin.emergency_route_issue",
    },
  },
  homework: {
    student: {
      assigned: "homework.student.assigned",
      reminder: "homework.student.reminder",
      duePassed: "homework.student.due_passed",
    },
    parent: {
      assigned: "homework.parent.assigned",
      reminder: "homework.parent.reminder",
      submitted: "homework.parent.submitted",
      notSubmitted: "homework.parent.not_submitted",
      duePassed: "homework.parent.due_passed",
    },
  },
  fees: {
    parent: {
      feeAdded: "fees.parent.fee_added",
      feeDue: "fees.parent.fee_due",
      dueReminder: "fees.parent.due_reminder",
      overdue: "fees.parent.overdue",
      paymentReceived: "fees.parent.payment_received",
      receiptAvailable: "fees.parent.receipt_available",
    },
  },
  /** Exams category; IDs keep prior Nexus `marks.*` catalog keys where noted. */
  exams: {
    parent: {
      marksPublished: "marks.parent.published",
      timetablePublished: "exams.parent.timetable_published",
      reminder1d: "exams.parent.reminder_1d",
      reminder1h: "exams.parent.reminder_1h",
      dateChanged: "exams.parent.date_changed",
      timeChanged: "exams.parent.time_changed",
      venueChanged: "exams.parent.venue_changed",
      postponed: "exams.parent.postponed",
      cancelled: "exams.parent.cancelled",
      resultUpdated: "exams.parent.result_updated",
    },
    student: {
      marksPublished: "marks.student.published",
      timetablePublished: "exams.student.timetable_published",
      reminder1d: "exams.student.reminder_1d",
      reminder1h: "exams.student.reminder_1h",
      dateChanged: "exams.student.date_changed",
      timeChanged: "exams.student.time_changed",
      venueChanged: "exams.student.venue_changed",
      postponed: "exams.student.postponed",
      cancelled: "exams.student.cancelled",
      resultUpdated: "exams.student.result_updated",
    },
    teacher: {
      marksEntryDeadline: "marks.teacher.entry_deadline",
      timetablePublished: "exams.teacher.timetable_published",
      marksPending: "exams.teacher.marks_pending",
      deadlineApproaching: "exams.teacher.deadline_approaching",
      marksPublishPending: "exams.teacher.marks_publish_pending",
    },
    admin: {
      marksPending: "exams.admin.marks_pending",
      resultsReady: "exams.admin.results_ready",
    },
  },
  events: {
    audience: {
      published: "events.audience.published",
      reminder1d: "events.audience.reminder_1d",
      reminder1h: "events.audience.reminder_1h",
      changed: "events.audience.changed",
      cancelled: "events.audience.cancelled",
    },
  },
  timetable: {
    audience: {
      published: "timetable.audience.published",
      changed: "timetable.audience.changed",
      importantChange: "timetable.audience.important_change",
    },
  },
  announcements: {
    audience: {
      broadcast: "announcements.audience.broadcast",
    },
  },
  messages: {
    student: {
      welcome: "student.connect.welcome",
      newMessage: "messages.student.new_message",
    },
    parent: {
      linked: "parent.connect.linked",
      newMessage: "messages.parent.new_message",
    },
    teacher: {
      newMessage: "messages.teacher.new_message",
    },
  },
  system: {
    institute: {
      opsCritical: "alerts.institute.ops_critical",
      securityEvent: "system.institute.security_event",
      accountSecurityChange: "system.institute.account_security_change",
      maintenance: "system.institute.maintenance",
      systemWarning: "system.institute.system_warning",
    },
    nexus: {
      licenseRenewal: "system.nexus.license_renewal",
      moduleEntitlement: "system.nexus.module_entitlement",
    },
  },
  complaints: {
    requester: {
      submitted: "complaints.requester.submitted",
      received: "complaints.requester.received",
      underReview: "complaints.requester.under_review",
      resolved: "complaints.requester.resolved",
      rejected: "complaints.requester.rejected",
    },
  },
  documents: {
    requester: {
      requestReceived: "documents.requester.request_received",
      requestApproved: "documents.requester.request_approved",
      requestRejected: "documents.requester.request_rejected",
      documentGenerated: "documents.requester.document_generated",
      documentReady: "documents.requester.document_ready",
    },
  },
  certificates: {
    recipient: {
      issued: "certificates.recipient.issued",
      published: "certificates.recipient.published",
    },
  },
  leave: {
    teacher: {
      diaryReminder: "teacher.diary.reminder",
      studentRequest: "leave.teacher.student_request",
      decision: "leave.teacher.decision",
      pending: "leave.teacher.pending",
    },
    parent: {
      decision: "leave.parent.decision",
      pending: "leave.parent.pending",
    },
    admin: {
      teacherRequest: "leave.admin.teacher_request",
    },
  },
} as const;
