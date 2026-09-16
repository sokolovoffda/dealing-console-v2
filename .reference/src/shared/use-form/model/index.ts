import { reactive, watch, Reactive, ref } from 'vue'

import { useLocalization } from '@/shared/i18n'

import { FieldConverter, FieldValidation, FormState, ValidationSchema } from '../types'

export function useForm <T extends Record<string, string> = FormState> (initialState: T, validationSchema: ValidationSchema<T>) {
  const form = reactive({ ...initialState })
  const errors = reactive<Map<keyof T, string>>(new Map()) // Сохраняет все ошибки в форме

  const _formValidation = reactive<Record<string, FieldValidation>>({}) // Создаем объект с правилами валидации для каждого поля
  const _isSubmitted = ref(false)

  for (const field in validationSchema) {
    _formValidation[field] = {
      rules: validationSchema[field],
      errorMessage: '',
      isValid: false,
    }
  }

  // Валидация каждого поля
  const validateField = (field: string) => {
    const { t } = useLocalization()
    let errorMsg = ''
    const rules = _formValidation[field]?.rules
    if (!rules) return

    const isNotRequired = !rules.includes('required')
    const isEmpty = !(Boolean(form[field]))

    for (const rule of rules) {
      if (typeof rule === 'function') {
        const errorMessage = rule()
        if (errorMessage) {
          errorMsg = errorMessage
        }
      } else {
        const [ruleName, arg] = rule.split(':')
        switch (ruleName) {
        case 'required': {
          if (!form[field]) {
            console.warn(`Field ${field} is required.`)
            errorMsg = t('FieldIsRequired')
          }
          break
        }
        case 'min': {
          // Если поле не обязательно и пустое, пропускаем проверку
          if (isNotRequired && isEmpty) {
            break
          }

          if (form[field] && form[field].length < parseInt(arg)) {
            console.warn(`Minimum character length for ${field}: ${arg}`)
            errorMsg = t('MinCharacterLength', { arg })
          }
          break
        }
        case 'max': {
          // Если поле не обязательно и пустое, пропускаем проверку
          if (isNotRequired && isEmpty) {
            break
          }

          if (form[field] && form[field].length > parseInt(arg)) {
            console.warn(`Maximum character length for ${field}: ${arg}`)
            errorMsg = t('MaxCharacterLength', { arg })
          }
          break
        }
        case 'email': {
          // Если поле не обязательно и пустое, пропускаем проверку
          if (isNotRequired && isEmpty) {
            break
          }

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form[field])) {
            console.warn('Invalid email format')
            errorMsg = t('InvalidEmailFormat')
          }
          break
        }
        case 'number': {
          // Если поле не обязательно и пустое, пропускаем проверку
          if (isNotRequired && isEmpty) {
            break
          }

          if (!/^\d+$/.test(form[field])) {
            console.warn('Invalid number format')
            errorMsg = t('InvalidNumberFormat')
          }
          break
        }
        case 'mobilePhone': {
          // Если поле не обязательно и пустое, пропускаем проверку
          if (isNotRequired && isEmpty) {
            break
          }

          if (!/(^8|7|\+7)((\d{10})|(\s\(\d{3}\)\s\d{3}\s\d{2}\s\d{2}))/.test(form[field])) {
            console.warn('Invalid mobile phone number')
            errorMsg = t('InvalidMobilePhoneFormat')
          }
          break
        }
        case 'date': {
          // Если поле не обязательно и пустое, пропускаем проверку
          if (isNotRequired && isEmpty) {
            break
          }

          if (!/^\d{4}-\d{2}-\d{2}$/.test(form[field])) {
            console.warn('Invalid date format')
            errorMsg = t('InvalidDateFormat')
          }
          break
        }
        }
      }

      if (errorMsg) {
        break
      }
    }
    _formValidation[field].errorMessage = errorMsg
    _formValidation[field].isValid = !errorMsg

    if (errorMsg) {
      errors.set(field, errorMsg)
    }
  }
  // Валидируем все поля
  const validateAll = () => {
    for (const field in _formValidation) {
      validateField(field)
    }
    return Object.values(_formValidation).every(validation => validation.isValid)
  }

  const _handleInput = (field: string) => {
    if (errors.has(field)) {
      errors.delete(field)
    }

    validateField(field)
  }

  const _clearErrors = () => {
    for (const field in errors) {
      errors.delete(field)
      _formValidation[field].errorMessage = ''
      _formValidation[field].isValid = false
    }
  }
  
  const submit = <K> (callback: (arg: Reactive<T>) => Promise<K>, fieldConverters?: FieldConverter<T>): Promise<K | boolean> => {
    return new Promise((resolve, reject) => {
      _isSubmitted.value = true

      const isValid = validateAll()
      if (!isValid) {
        resolve(false)
        return
      }

      const payload = { ...form }

      if (fieldConverters) {
        fieldConverters.forEach(({ field, handler }) => {
          payload[field] = handler()
        })
      }

      callback(payload)
        .then((response) => {
          resolve(response)
          _clearErrors()
        }).catch(reject).finally(() => {
          _isSubmitted.value = false
        })
    })
  }

  // Отслеживаем изменения формы
  watch(form, (newForm) => {
    if (!_isSubmitted.value) {
      return
    }
    for (const field in newForm) {
      _handleInput(field)
    }
  }, { deep: true })

  return {
    form,
    errors,
    submit,
  }
}
