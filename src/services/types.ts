export interface FormReadRequest {
  request: {
    type: string;
    subType: string;
    action: string;
    component: string;
    rootOrgId: string;
    framework?: string;
  };
}
