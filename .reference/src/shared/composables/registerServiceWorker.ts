import { register } from 'register-service-worker'

if (import.meta.env.NODE_ENV === 'production') {
  register(`${import.meta.env.BASE_URL}service-worker.js`)
}
