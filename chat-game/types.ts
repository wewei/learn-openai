export const tyUnit = Symbol("@unit");
export const tyString = Symbol("@string");
export const tyNumber = Symbol("@number");
export const tyBoolean = Symbol("@boolean");
export const tyNull = Symbol("@null");

export type PrimaryTypes
    = typeof tyUnit
    | typeof tyString
    | typeof tyNumber
    | typeof tyBoolean
    | typeof tyNull

export type ProductType = {
    ctor: "Product";
    fragments: Record<
        string,
        {
            description: string;
            type: Type;
        }
    >;
};

export type UnionType = {
    ctor: "Union";
    fragments: Record<
        string,
        {
            description: string;
            type: Type;
        }
    >;
};

export type ListType = {
    ctor: "List";
    type: Type;
};

export type Type = PrimaryTypes | ProductType | UnionType | ListType;