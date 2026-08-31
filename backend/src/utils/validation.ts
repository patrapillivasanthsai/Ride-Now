import { VehicleType } from '@prisma/client';

/**
 * Normalizes Indian mobile phone numbers to "+91 XXXXX XXXXX" format.
 * Leaves non-matching / mock / international phone numbers unaltered.
 */
export function normalizeIndianPhoneNumber(phone: string): string {
  if (!phone) return phone;
  const digits = phone.replace(/\D/g, '');
  const trimmed = phone.trim();

  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    const main = digits.slice(2);
    return `+91 ${main.slice(0, 5)} ${main.slice(5)}`;
  }

  return trimmed;
}

/**
 * Normalizes Indian registration plates to "KA 01 AB 1234" spacing.
 * Leaves non-matching dev mock plates unaltered.
 */
export function normalizeIndianPlateNumber(plate: string): string {
  if (!plate) return plate;
  const upper = plate.trim().toUpperCase();
  const stripped = upper.replace(/\s+/g, '');
  const indianPlateRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;

  if (indianPlateRegex.test(stripped)) {
    const state = stripped.slice(0, 2);
    const rto = stripped.slice(2, 4);
    let series = '';
    let num = '';

    if (isNaN(Number(stripped.charAt(5)))) {
      series = stripped.slice(4, 6);
      num = stripped.slice(6);
    } else {
      series = stripped.slice(4, 5);
      num = stripped.slice(5);
    }
    return `${state} ${rto} ${series} ${num}`;
  }

  return upper;
}

/**
 * Validates standard Indian driving license numbers.
 * Permissive alphanumeric check with length boundaries.
 */
export function validateDrivingLicense(license: string): boolean {
  if (!license) return false;
  const cleaned = license.replace(/[\s-]/g, '');
  return cleaned.length >= 8 && cleaned.length <= 25 && /^[A-Z0-9]+$/i.test(cleaned);
}

/**
 * Maps user-facing vehicle category types to database-stored VehicleType enums.
 */
export function mapUserFacingToDbVehicleType(type: string): VehicleType {
  const t = type.trim().toLowerCase();
  if (t === 'bike') return VehicleType.BIKE;
  if (t === 'auto') return VehicleType.AUTO;
  if (t === 'cab' || t === 'car') return VehicleType.CAB;
  return VehicleType.CAB;
}

/**
 * Maps database-stored VehicleType enums back to user-facing category types.
 */
export function mapDbToUserFacingVehicleType(type: VehicleType): string {
  if (type === VehicleType.BIKE) return 'Bike';
  if (type === VehicleType.AUTO) return 'Auto';
  if (type === VehicleType.CAB) return 'Cab';
  return 'Cab';
}
