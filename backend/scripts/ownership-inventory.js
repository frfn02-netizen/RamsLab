"use strict";

/*
 * Read-only Meetings ownership inventory.
 *
 * Manual execution example:
 *
 *   mongosh "<approved-connection-string>/rams_platform_security_test" \
 *     --file ownership-inventory.js
 *
 * This script does not read or print credentials, connection strings,
 * user profile fields, meeting title, participant data, or external
 * participant data.
 */

const EXPECTED_DATABASE_NAME = "rams_platform_security_test";
const REQUIRED_MONGODB_MAJOR = 5;
const REQUIRED_MONGODB_MINOR = 2;

const MAX_SAMPLES = 10;
const MEETINGS_COLLECTION = "meetings";
const USERS_COLLECTION = "users";

if (db.getName() !== EXPECTED_DATABASE_NAME) {
  throw new Error(
    `Refusing to run ownership inventory against database "${db.getName()}". ` +
      `Expected "${EXPECTED_DATABASE_NAME}".`,
  );
}

function supportsRequiredMongoVersion(version) {
  const match = String(version).match(/^(\d+)\.(\d+)/);

  if (!match) {
    return false;
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);

  return (
    major > REQUIRED_MONGODB_MAJOR ||
    (major === REQUIRED_MONGODB_MAJOR && minor >= REQUIRED_MONGODB_MINOR)
  );
}

/*
 * $sortArray and the $topN accumulator were introduced in MongoDB 5.2.
 * Fail before any inventory aggregation if the server is older.
 */
const serverVersion = db.version();

if (!supportsRequiredMongoVersion(serverVersion)) {
  throw new Error(
    "This read-only inventory requires MongoDB 5.2 or newer " +
      "for $sortArray and $topN.",
  );
}

const meetings = db.getCollection(MEETINGS_COLLECTION);

function fieldStateExpression(fieldName) {
  return {
    $switch: {
      branches: [
        {
          case: {
            $eq: [{ $type: `$${fieldName}` }, "missing"],
          },
          then: "missing",
        },
        {
          case: {
            $eq: [{ $type: `$${fieldName}` }, "null"],
          },
          then: "null",
        },
        {
          case: {
            $eq: [{ $type: `$${fieldName}` }, "objectId"],
          },
          then: "objectId",
        },
      ],
      default: "invalid_type",
    },
  };
}

function ownershipCombinationExpression() {
  return {
    $switch: {
      branches: [
        {
          case: {
            $and: [
              { $eq: ["$createdByState", "objectId"] },
              { $eq: ["$organizerIdState", "objectId"] },
              { $eq: ["$createdBy", "$organizerId"] },
            ],
          },
          then: "both_objectid_equal",
        },
        {
          case: {
            $and: [
              { $eq: ["$createdByState", "objectId"] },
              { $eq: ["$organizerIdState", "objectId"] },
              { $ne: ["$createdBy", "$organizerId"] },
            ],
          },
          then: "both_objectid_different",
        },
      ],
      default: {
        $concat: ["$createdByState", "|", "$organizerIdState"],
      },
    },
  };
}

function ownershipStateStages() {
  return [
    {
      $set: {
        createdByState: fieldStateExpression("createdBy"),
        organizerIdState: fieldStateExpression("organizerId"),
      },
    },
    {
      $set: {
        ownershipCombination: ownershipCombinationExpression(),
      },
    },
  ];
}

function categoryResultStages(additionalStages = []) {
  return [
    ...additionalStages,
    {
      $facet: {
        count: [{ $count: "value" }],
        samples: [
          { $sort: { _id: 1 } },
          { $limit: MAX_SAMPLES },
          {
            $project: {
              _id: 1,
              idType: { $type: "$_id" },
            },
          },
        ],
      },
    },
  ];
}

function safeSampleMeetingId(sample) {
  const scalarTypes = new Set([
    "objectId",
    "string",
    "int",
    "long",
    "double",
    "decimal",
    "bool",
    "date",
    "binData",
  ]);

  if (!scalarTypes.has(sample.idType)) {
    return {
      meetingId: "<redacted-non-scalar-id>",
      bsonType: sample.idType,
    };
  }

  return {
    meetingId: sample._id,
    bsonType: sample.idType,
  };
}

async function getCategoryResult(additionalStages = []) {
  const [result] = await meetings
    .aggregate(categoryResultStages(additionalStages), {
      allowDiskUse: true,
    })
    .toArray();

  return {
    count: result?.count?.[0]?.value ?? 0,
    samples: (result?.samples ?? []).map(safeSampleMeetingId),
  };
}

function printCategory(category, result, description) {
  printjson({
    category,
    description,
    count: result.count,
    sampleMeetingIds: result.samples,
  });
}

async function printOwnershipCategory(category, additionalStages, description) {
  const result = await getCategoryResult([
    ...ownershipStateStages(),
    ...additionalStages,
  ]);

  printCategory(category, result, description);
}

async function printSimpleCategory(category, additionalStages, description) {
  const result = await getCategoryResult(additionalStages);
  printCategory(category, result, description);
}

function participantIdsContainsField(fieldName) {
  return {
    $expr: {
      $and: [
        { $isArray: "$participantIds" },
        {
          $in: [
            `$${fieldName}`,
            {
              $cond: [{ $isArray: "$participantIds" }, "$participantIds", []],
            },
          ],
        },
      ],
    },
  };
}

/*
 * Lookup only the users document _id.
 *
 * No user profile fields are projected into the intermediate result.
 * The lookup is only used to identify broken ownership references.
 */
function validUserLookupStages(localField, outputField) {
  return [
    {
      $lookup: {
        from: USERS_COLLECTION,
        let: {
          candidateId: `$${localField}`,
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$_id", "$$candidateId"],
              },
            },
          },
          {
            $project: {
              _id: 1,
            },
          },
          {
            $limit: 1,
          },
        ],
        as: outputField,
      },
    },
    {
      $match: {
        $expr: {
          $eq: [{ $size: `$${outputField}` }, 0],
        },
      },
    },
  ];
}

/*
 * Normalize participantIds for duplicate-candidate grouping.
 *
 * Rules:
 * - Missing, null, or non-array participantIds become [].
 * - Each element is converted to BSON ObjectId with onError/onNull set to null.
 * - Valid ObjectIds and valid ObjectId strings become the same string form.
 * - Malformed elements are discarded from the candidate key.
 * - $setUnion removes repeated values.
 * - $sortArray makes array order irrelevant.
 *
 * The normalized list is used only as an internal grouping key and is never
 * returned in the output.
 */
function normalizedParticipantIdsExpression() {
  return {
    $let: {
      vars: {
        convertedParticipantIds: {
          $map: {
            input: {
              $cond: [{ $isArray: "$participantIds" }, "$participantIds", []],
            },
            as: "participantId",
            in: {
              $convert: {
                input: "$$participantId",
                to: "objectId",
                onError: null,
                onNull: null,
              },
            },
          },
        },
      },
      in: {
        $let: {
          vars: {
            validParticipantIds: {
              $map: {
                input: {
                  $filter: {
                    input: "$$convertedParticipantIds",
                    as: "participantId",
                    cond: {
                      $eq: [{ $type: "$$participantId" }, "objectId"],
                    },
                  },
                },
                as: "participantId",
                in: {
                  $toString: "$$participantId",
                },
              },
            },
          },
          in: {
            $sortArray: {
              input: {
                $setUnion: ["$$validParticipantIds", []],
              },
              sortBy: 1,
            },
          },
        },
      },
    },
  };
}

/*
 * Duplicate candidate key:
 *
 * - createdBy
 * - normalized title
 * - startAt
 * - endAt
 * - effective visibility
 * - normalized participantIds
 *
 * The key is never printed. It is used only inside MongoDB.
 *
 * Intentionally excluded:
 * - description
 * - meetingLink
 * - externalParticipants
 * - organizerId
 * - audit history
 * - createdAt / updatedAt
 * - cancellation timestamps
 */
function duplicateCandidateStages() {
  return [
    {
      $match: {
        $expr: {
          $and: [
            /* Invalid _id documents are reported separately. */
            { $eq: [{ $type: "$_id" }, "objectId"] },

            /* Require core fields for a meaningful comparison. */
            { $eq: [{ $type: "$createdBy" }, "objectId"] },
            { $eq: [{ $type: "$title" }, "string"] },
            { $eq: [{ $type: "$startAt" }, "date"] },
            { $eq: [{ $type: "$endAt" }, "date"] },
          ],
        },
      },
    },
    {
      $set: {
        duplicateCandidateTitle: {
          $toLower: {
            $trim: {
              input: "$title",
            },
          },
        },

        /* Missing, null, or invalid visibility defaults to PRIVATE. */
        duplicateCandidateVisibility: {
          $cond: [
            {
              $eq: [{ $type: "$visibility" }, "string"],
            },
            {
              $cond: [
                { $eq: ["$visibility", "INTERNAL"] },
                "INTERNAL",
                "PRIVATE",
              ],
            },
            "PRIVATE",
          ],
        },

        duplicateCandidateParticipantIds: normalizedParticipantIdsExpression(),
      },
    },
    {
      $group: {
        _id: {
          createdBy: "$createdBy",
          title: "$duplicateCandidateTitle",
          startAt: "$startAt",
          endAt: "$endAt",
          visibility: "$duplicateCandidateVisibility",
          participantIds: "$duplicateCandidateParticipantIds",
        },

        /* Exact group size, independent of the ten-item sample. */
        candidateCount: {
          $sum: 1,
        },

        /* Keep at most ten IDs per group during aggregation. */
        sampleMeetingIds: {
          $topN: {
            output: "$_id",
            sortBy: {
              _id: 1,
            },
            n: MAX_SAMPLES,
          },
        },
      },
    },
    {
      $match: {
        candidateCount: {
          $gt: 1,
        },
      },
    },
    {
      $sort: {
        candidateCount: -1,
      },
    },
    {
      $project: {
        _id: 0,
        candidateCount: 1,
        sampleMeetingIds: 1,
      },
    },
  ];
}

async function printDuplicateCandidateGroups() {
  const groups = await meetings
    .aggregate(duplicateCandidateStages(), {
      allowDiskUse: true,
    })
    .toArray();

  /* Never print the internal grouping key. */
  printjson({
    category: "duplicateMeetingCandidates",
    description:
      "Candidate groups only. A group is not proof that meetings are duplicates.",
    groupCount: groups.length,
    groups: groups.map((group, index) => ({
      groupNumber: index + 1,
      candidateCount: group.candidateCount,
      sampleMeetingIds: (group.sampleMeetingIds ?? []).slice(0, MAX_SAMPLES),
    })),
  });
}

(async () => {
  printjson({
    inventory: "meetings-ownership",
    database: db.getName(),
    collection: MEETINGS_COLLECTION,
    mode: "read-only",
    mongodbFeatureRequirement: "MongoDB 5.2 or newer",
    maxSamplesPerCategory: MAX_SAMPLES,
  });

  const totalMeetings = await meetings.countDocuments({});

  printjson({
    category: "totalMeetings",
    description: "Total number of documents in the meetings collection.",
    count: totalMeetings,
  });

  await printSimpleCategory(
    "meetingsWithNonObjectId_id",
    [
      {
        $match: {
          $expr: {
            $ne: [{ $type: "$_id" }, "objectId"],
          },
        },
      },
    ],
    "Meetings whose _id is not a BSON ObjectId. Scalar IDs are shown with their BSON type; non-scalar IDs are redacted.",
  );

  await printOwnershipCategory(
    "meetingsWithoutCreatedByObjectId",
    [
      {
        $match: {
          $expr: {
            $ne: ["$createdByState", "objectId"],
          },
        },
      },
    ],
    "Meetings where createdBy is missing, null, or has an invalid BSON type.",
  );

  await printOwnershipCategory(
    "createdByMissing",
    [
      {
        $match: {
          createdByState: "missing",
        },
      },
    ],
    "Meetings where createdBy is missing.",
  );

  await printOwnershipCategory(
    "createdByNull",
    [
      {
        $match: {
          createdByState: "null",
        },
      },
    ],
    "Meetings where createdBy is explicitly null.",
  );

  await printOwnershipCategory(
    "createdByInvalidType",
    [
      {
        $match: {
          createdByState: "invalid_type",
        },
      },
    ],
    "Meetings where createdBy exists but is not a BSON ObjectId.",
  );

  await printOwnershipCategory(
    "meetingsWithoutOrganizerIdObjectId",
    [
      {
        $match: {
          $expr: {
            $ne: ["$organizerIdState", "objectId"],
          },
        },
      },
    ],
    "Meetings where organizerId is missing, null, or has an invalid BSON type.",
  );

  await printOwnershipCategory(
    "organizerIdMissing",
    [
      {
        $match: {
          organizerIdState: "missing",
        },
      },
    ],
    "Meetings where organizerId is missing.",
  );

  await printOwnershipCategory(
    "organizerIdNull",
    [
      {
        $match: {
          organizerIdState: "null",
        },
      },
    ],
    "Meetings where organizerId is explicitly null.",
  );

  await printOwnershipCategory(
    "organizerIdInvalidType",
    [
      {
        $match: {
          organizerIdState: "invalid_type",
        },
      },
    ],
    "Meetings where organizerId exists but is not a BSON ObjectId.",
  );

  await printOwnershipCategory(
    "createdByDifferentFromOrganizerId",
    [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$createdByState", "objectId"] },
              { $eq: ["$organizerIdState", "objectId"] },
              { $ne: ["$createdBy", "$organizerId"] },
            ],
          },
        },
      },
    ],
    "Meetings where createdBy and organizerId are both ObjectIds but differ.",
  );

  await printOwnershipCategory(
    "createdByWithoutValidUser",
    [
      {
        $match: {
          createdByState: "objectId",
        },
      },
      ...validUserLookupStages("createdBy", "createdByUsers"),
    ],
    "Meetings where createdBy is an ObjectId but no matching users document exists.",
  );

  await printOwnershipCategory(
    "organizerIdWithoutValidUser",
    [
      {
        $match: {
          organizerIdState: "objectId",
        },
      },
      ...validUserLookupStages("organizerId", "organizerUsers"),
    ],
    "Meetings where organizerId is an ObjectId but no matching users document exists.",
  );

  await printOwnershipCategory(
    "ownershipCombinationsRequiringReview",
    [
      {
        $match: {
          $or: [
            { ownershipCombination: "both_objectid_different" },
            { ownershipCombination: /^missing\|/ },
            { ownershipCombination: /^\|/ },
            { ownershipCombination: /^null\|/ },
            { ownershipCombination: /^invalid_type\|/ },
            { ownershipCombination: /missing$/ },
            { ownershipCombination: /\|null$/ },
            { ownershipCombination: /\|invalid_type$/ },
          ],
        },
      },
    ],
    "Ownership combinations that are not two equal BSON ObjectIds.",
  );

  await printOwnershipCategory(
    "createdByAlsoPresentInParticipantIds",
    [
      {
        $match: participantIdsContainsField("createdBy"),
      },
    ],
    "Meetings where createdBy also appears in participantIds. Informational only.",
  );

  await printOwnershipCategory(
    "organizerIdAlsoPresentInParticipantIds",
    [
      {
        $match: participantIdsContainsField("organizerId"),
      },
    ],
    "Meetings where organizerId also appears in participantIds. Informational only.",
  );

  const ownershipCombinationSummary = await meetings
    .aggregate([
      ...ownershipStateStages(),
      {
        $group: {
          _id: "$ownershipCombination",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ])
    .toArray();

  printjson({
    category: "ownershipCombinationSummary",
    description:
      "Counts by the BSON-state combination of createdBy and organizerId.",
    combinations: ownershipCombinationSummary.map((entry) => ({
      combination: entry._id,
      count: entry.count,
    })),
  });

  for (const combination of ownershipCombinationSummary) {
    const result = await getCategoryResult([
      ...ownershipStateStages(),
      {
        $match: {
          ownershipCombination: combination._id,
        },
      },
    ]);

    printCategory(
      `ownershipCombination:${combination._id}`,
      result,
      "Sample meeting identifiers for this ownership combination.",
    );
  }

  await printDuplicateCandidateGroups();

  printjson({
    completed: true,
    readOnly: true,
    mutationsAttempted: false,
  });
})().catch((error) => {
  /* Do not print complete driver errors or connection metadata. */
  printjson({
    completed: false,
    readOnly: true,
    error: "Ownership inventory failed before completion.",
    errorType: error?.name ?? "UnknownError",
  });

  quit(1);
});
