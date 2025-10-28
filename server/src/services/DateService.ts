
export interface IDateService {
    now() : Date
}

export class DateService implements IDateService {
    now(): Date {
        return new Date();
    }
}