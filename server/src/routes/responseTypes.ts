/*
  Common response types from APIs
*/
export type ErrorMessage = {
  error: string,
  message: string
}

export type FieldErrorMessage = {
  field: string;
  message: string;
}

export type ValidationErrorMessage = ErrorMessage & {
  details: FieldErrorMessage[]
}
