export interface PublicContentPageDto {
  page_code: string;
  title: string;
  content: string;
  updated_at: string;
}

export interface ContentPageDto extends PublicContentPageDto {
  page_id: number;
  updated_by_account_id: number;
}

export interface ContentPageCreateInput {
  page_code: string;
  title: string;
  content: string;
}

export interface ContentPagePatchInput {
  title?: string;
  content?: string;
}
