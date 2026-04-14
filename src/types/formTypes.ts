export interface FormReadRequest {
  type: string;
  subType?: string;
  action: string;
  component?: string;
  rootOrgId?: string;
  framework?: string;
}

export interface FormReadResponse {
  form: {
    framework: string;
    type: string;
    subtype: string;
    action: string;
    component: string;
    data: any;
    created_on: string;
    last_modified_on: string;
    rootOrgId: string;
  };
}

/** A label can be a plain string or a locale object (e.g. { en: "Hello", fr: "Bonjour" }) */
export type LocaleString = string | Record<string, string>;

export interface ExploreFilterOption {
  id: string;
  index: number;
  label: LocaleString;
  code: string;
  value: string | string[];
}

export interface ExploreFilterGroup {
  id: string;
  index: number;
  label: LocaleString;
  options?: ExploreFilterOption[];
  list?: ExploreFilterOption[];
}

export interface UseFormReadOptions {
  request: FormReadRequest;
  enabled?: boolean;
}

// Keys are the API `code` field (e.g. "primaryCategory"), values are selected option values
export type FilterState = Record<string, string[]>;
