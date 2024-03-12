import { JSONSchema7 }  from 'json-schema';

export type Form = {
    name: string;
    description: string;
    properties: Record<string, JSONSchema7>; 
    required: string[];
};
