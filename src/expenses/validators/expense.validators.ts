import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator'

@ValidatorConstraint({ name: 'isDateRangeValid', async: false })
export class IsDateRangeValidConstraint
  implements ValidatorConstraintInterface
{
  validate(endDate: string, args: ValidationArguments) {
    const [startDateProperty] = args.constraints
    const startDate = (args.object as any)[startDateProperty]

    if (!startDate || !endDate) {
      return true // Let other validators handle required validation
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false
    }

    // End date should be after or equal to start date
    return end >= start
  }

  defaultMessage(args: ValidationArguments) {
    const [startDateProperty] = args.constraints
    return `End date must be after or equal to ${startDateProperty}`
  }
}

export function IsDateRangeValid(
  startDateProperty: string,
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [startDateProperty],
      validator: IsDateRangeValidConstraint
    })
  }
}

@ValidatorConstraint({ name: 'isAmountRangeValid', async: false })
export class IsAmountRangeValidConstraint
  implements ValidatorConstraintInterface
{
  validate(maxAmount: number, args: ValidationArguments) {
    const [minAmountProperty] = args.constraints
    const minAmount = (args.object as any)[minAmountProperty]

    if (!minAmount || !maxAmount) {
      return true // Let other validators handle required validation
    }

    // Max amount should be greater than or equal to min amount
    return maxAmount >= minAmount
  }

  defaultMessage(args: ValidationArguments) {
    const [minAmountProperty] = args.constraints
    return `Maximum amount must be greater than or equal to ${minAmountProperty}`
  }
}

export function IsAmountRangeValid(
  minAmountProperty: string,
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [minAmountProperty],
      validator: IsAmountRangeValidConstraint
    })
  }
}

@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(dateString: string, args: ValidationArguments) {
    if (!dateString) {
      return true // Let other validators handle required validation
    }

    const inputDate = new Date(dateString)
    const today = new Date()

    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0)
    inputDate.setHours(0, 0, 0, 0)

    // Date should not be more than 1 day in the future (allowing for timezone differences)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return inputDate <= tomorrow
  }

  defaultMessage(args: ValidationArguments) {
    return 'Date cannot be in the future beyond today'
  }
}

export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsFutureDateConstraint
    })
  }
}
