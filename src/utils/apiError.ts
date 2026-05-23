// Copied from web app — zero changes required
export function apiErrMsg(e: unknown, fallback = 'Something went wrong'): string {
  const ae = e as { response?: { data?: { error?: string; message?: string } } }
  return ae?.response?.data?.error ?? ae?.response?.data?.message ?? fallback
}
