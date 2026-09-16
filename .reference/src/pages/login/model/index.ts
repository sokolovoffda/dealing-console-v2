import { readonly } from 'vue'

const form: { login: null | string, password: null | string } = { login: null, password: null }

export const useLoginFormState = () => {
  const setState = (payload: { login: string, password: string }) => {
    form.login = payload.login
    form.password = payload.password
  }
    
  const getState = () => {
    return readonly(form)
  }
    
  const clearState = () => {
    form.login = null
    form.password = null
  }
    
  return {
    setState,
    getState,
    clearState,
  }
}