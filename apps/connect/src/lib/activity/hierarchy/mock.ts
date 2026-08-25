import type {
  HierarchyEcaActivity,
  HierarchyGroup,
  HierarchySport,
  HierarchyTeam,
} from "./types";

export const hierarchySportsSeed: HierarchySport[] = [
  { id: "sport-cricket", name: "Cricket", category: "outdoor", createdAt: "2025-06-01" },
  { id: "sport-kabaddi", name: "Kabaddi", category: "outdoor", createdAt: "2025-06-01" },
  { id: "sport-badminton", name: "Badminton", category: "indoor", createdAt: "2025-06-01" },
  { id: "sport-chess", name: "Chess", category: "indoor", createdAt: "2025-06-01" },
];

export const hierarchyTeamsSeed: HierarchyTeam[] = [
  {
    id: "team-cricket-1",
    sportId: "sport-cricket",
    name: "Team 1",
    createdAt: "2025-05-20",
    students: [
      { id: "stu-h1", name: "Dev Malhotra", rollNo: "1011", classLabel: "12-B" },
      { id: "stu-h2", name: "Amit Joshi", rollNo: "1019", classLabel: "12-B" },
      { id: "stu-h3", name: "Rahul Verma", rollNo: "1022", classLabel: "12-A" },
    ],
  },
  {
    id: "team-cricket-2",
    sportId: "sport-cricket",
    name: "Team 2",
    createdAt: "2025-06-01",
    students: [
      { id: "stu-h4", name: "Karan Mehta", rollNo: "0811", classLabel: "10-A" },
      { id: "stu-h5", name: "Vivek Shah", rollNo: "0819", classLabel: "10-B" },
    ],
  },
  {
    id: "team-kabaddi-1",
    sportId: "sport-kabaddi",
    name: "Team 1",
    createdAt: "2025-08-10",
    students: [
      { id: "stu-h6", name: "Naveen Rao", rollNo: "1120", classLabel: "11-C" },
      { id: "stu-h7", name: "Prakash Singh", rollNo: "1124", classLabel: "11-B" },
    ],
  },
  {
    id: "team-badminton-1",
    sportId: "sport-badminton",
    name: "Team 1",
    createdAt: "2025-07-01",
    students: [
      { id: "stu-h8", name: "Anika Reddy", rollNo: "0303", classLabel: "12-A" },
    ],
  },
];

export const hierarchyEcaActivitiesSeed: HierarchyEcaActivity[] = [
  { id: "eca-dance", name: "Dance", createdAt: "2025-06-01" },
  { id: "eca-music", name: "Music", createdAt: "2025-06-01" },
  { id: "eca-singing", name: "Singing", createdAt: "2025-06-01" },
  { id: "eca-drama", name: "Drama", createdAt: "2025-06-01" },
  { id: "eca-yoga", name: "Yoga", createdAt: "2025-06-01" },
  { id: "eca-karate", name: "Karate", createdAt: "2025-06-01" },
  { id: "eca-art", name: "Art", createdAt: "2025-06-01" },
];

export const hierarchyGroupsSeed: HierarchyGroup[] = [
  {
    id: "group-dance-1",
    activityId: "eca-dance",
    name: "Group 1",
    createdAt: "2025-06-15",
    students: [
      { id: "stu-1", name: "Arjun Mehta", rollNo: "12", classLabel: "9-A" },
      { id: "stu-2", name: "Priya Nair", rollNo: "18", classLabel: "9-A" },
    ],
  },
  {
    id: "group-music-1",
    activityId: "eca-music",
    name: "Choir",
    createdAt: "2025-06-20",
    students: [
      { id: "stu-6", name: "Meera Iyer", rollNo: "9", classLabel: "11-A" },
      { id: "stu-8", name: "Anika Reddy", rollNo: "3", classLabel: "12-A" },
    ],
  },
];
