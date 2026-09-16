import { Reactive } from 'vue'

export interface ValidationRule {
    (value: string): string | undefined;
}

export interface FormState {
    [field: string]: string;
}

type Rules = 'required' | `min:${number}` | `max:${number}` | 'email' | 'number' | 'mobilePhone' | 'date' | ((...args: Array<unknown>) => string | null)

export interface FieldValidation {
    rules: Rules[];
    errorMessage?: string;
    isValid: boolean;
}


export type ValidationSchema <T extends Record<string, string> = FormState> = {
    [field in keyof T]:  Rules[]
}

export type FieldConverter<T> = Array<{
    field: keyof Reactive<T>,
    handler: (args?: unknown[]) => Reactive<T>[keyof Reactive<T>],
}>