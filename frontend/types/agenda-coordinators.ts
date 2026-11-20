export interface AgendaCoordinatorStudent {
  id: string;
  displayName: string;
  email: string;
  role: "STUDENT";
  isActive: boolean;
  permissions: string[];
  hasAgendaManage: boolean;
  hasSchedulePortalAccess: boolean;
}

export interface AgendaCoordinatorPage {
  items: AgendaCoordinatorStudent[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
}
