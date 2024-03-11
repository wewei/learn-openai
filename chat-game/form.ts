import { JSONSchema7 }  from 'json-schema';

export type Form = {
    name: string;
    description: string;
    type: JSONSchema7 & { type: 'object' };
};
