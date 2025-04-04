export type GroupType = {
  id: number;
  name: string;
  remark: string | null;
};

export type ProxyType = {
  id: number;
  name: string;
  remark: string | null;
};

export type ProfileType = {
  id: number;
  name: string;
  group_name: string | null;
  proxy_name: string | null;
  remark: string | null;
};

export type ProfileStatusType = {
  name: string;
  running: boolean;
  loading: boolean;
  pid?: number;
};
