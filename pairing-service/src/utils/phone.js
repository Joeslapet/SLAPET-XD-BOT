export function validatePhoneNumber(input) {
  const phone = String(input || '').replace(/[^0-9]/g, '');
  if (!phone) {
    throw createValidationError('phoneNumber is required');
  }
  if (phone.length < 8 || phone.length > 15) {
    throw createValidationError('phoneNumber must use international format, 8 to 15 digits');
  }
  return phone;
}

function createValidationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}
