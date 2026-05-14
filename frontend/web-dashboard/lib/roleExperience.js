export function normalizeRole(role) {
  return String(role || "").toLowerCase();
}

function isAdvancedRole(role) {
  return ["super_admin", "hospital_admin", "technical_admin", "ops_admin", "developer", "admin"].includes(
    normalizeRole(role)
  );
}

const ROLE_NAV = {
  patient: [
    {
      label: "My Care",
      items: [
        { href: "/patient/home", label: "Home" },
        { href: "/patient/request", label: "Request Emergency Help" },
        { href: "/patient/status", label: "Emergency Status" },
        { href: "/patient/profile", label: "My Profile" },
      ],
    },
  ],
  doctor: [
    {
      label: "Clinical Workspace",
      items: [
        { href: "/dashboard", label: "Doctor Dashboard" },
        { href: "/consultations", label: "Assigned Cases" },
        { href: "/emergency/feed", label: "Emergency Cases" },
        { href: "/patients", label: "Patient Profiles" },
      ],
    },
  ],
  nurse: [
    {
      label: "Field Operations",
      items: [
        { href: "/dashboard", label: "Nurse Dashboard" },
        { href: "/patients", label: "Patient Profiles" },
        { href: "/hospital/queue", label: "Admissions Queue" },
        { href: "/emergency/feed", label: "Emergency Alerts" },
      ],
    },
  ],
  health_worker: [
    {
      label: "Field Operations",
      items: [
        { href: "/dashboard", label: "Health Worker Dashboard" },
        { href: "/patients", label: "Patient Profiles" },
        { href: "/hospital/queue", label: "Admissions Queue" },
        { href: "/emergency/feed", label: "Emergency Alerts" },
      ],
    },
  ],
  receptionist: [
    {
      label: "Front Desk",
      items: [
        { href: "/dashboard", label: "Reception Dashboard" },
        { href: "/patients", label: "Patients" },
        { href: "/hospital/queue", label: "Admissions Queue" },
        { href: "/reports", label: "Reports" },
      ],
    },
  ],
  emergency_coordinator: [
    {
      label: "Emergency Coordination",
      items: [
        { href: "/dashboard", label: "Coordination Dashboard" },
        { href: "/emergency/feed", label: "Live Emergency Feed" },
        { href: "/emergency/pulse", label: "Pulse Insights" },
        { href: "/reports", label: "Reports" },
      ],
    },
  ],
};

const CORE_NAV_GROUPS = [
  {
    label: "Main",
    items: [{ href: "/dashboard", label: "Dashboard" }],
  },
  {
    label: "Clinical Operations",
    items: [
      { href: "/patients", label: "Patients" },
      { href: "/consultations", label: "Consultations" },
      { href: "/emergency/feed", label: "Emergency Cases" },
      { href: "/hospital/queue", label: "Admissions & Queue" },
      { href: "/staff", label: "Doctors & Staff" },
      { href: "/reports", label: "Reports" },
    ],
  },
  {
    label: "Emergency Coordination",
    items: [
      { href: "/emergency/feed", label: "Live Emergency Feed" },
      { href: "/emergency/pulse", label: "Pulse Insights" },
    ],
  },
];

const ADVANCED_NAV_GROUP = {
  label: "System & Network Tools",
  items: [
    { href: "/triage", label: "Case Triage" },
    { href: "/reachability", label: "Device Reachability" },
    { href: "/subscriptions", label: "Reachability Subscriptions" },
    { href: "/location", label: "Location Lookup" },
    { href: "/identity", label: "Identity & OTP" },
    { href: "/qod", label: "QoD Sessions" },
    { href: "/qos", label: "QoS Assignments" },
    { href: "/device-identifier", label: "Device Identifier" },
    { href: "/geofencing", label: "Geofencing" },
    { href: "/click-to-dial", label: "Click-to-Dial" },
  ],
};

export function getNavGroupsForRole(role) {
  const normalized = normalizeRole(role);
  if (ROLE_NAV[normalized]) return ROLE_NAV[normalized];
  if (isAdvancedRole(normalized)) return [...CORE_NAV_GROUPS, ADVANCED_NAV_GROUP];
  return CORE_NAV_GROUPS;
}

export function getHomeRouteForRole(role) {
  const normalized = normalizeRole(role);
  if (normalized === "patient") return "/patient/home";
  return "/dashboard";
}

export function isRouteAllowedForRole(pathname, role) {
  const normalized = normalizeRole(role);
  if (!pathname || pathname === "/login") return true;

  if (isAdvancedRole(normalized)) return true;

  const groups = getNavGroupsForRole(normalized);
  const prefixes = groups.flatMap((group) => group.items.map((item) => item.href));

  return prefixes.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

export function getRoleTone(role) {
  const normalized = normalizeRole(role);
  if (normalized === "patient") {
    return {
      title: "Patient Care Hub",
      subtitle: "Simple, reassuring emergency support.",
    };
  }
  if (normalized === "doctor") {
    return {
      title: "Doctor Clinical Workspace",
      subtitle: "Focused consultations and emergency decisions.",
    };
  }
  if (["nurse", "health_worker"].includes(normalized)) {
    return {
      title: "Nurse Operations Workspace",
      subtitle: "Fast triage, registration, and emergency coordination.",
    };
  }
  return {
    title: "Clinical Operations Dashboard",
    subtitle: "Role-aware workflows with embedded Raphael Pulse context.",
  };
}
