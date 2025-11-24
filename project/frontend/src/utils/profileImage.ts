export interface ProfileImageEventDetail {
  userId?: number | null;
  profileImage?: string | null;
}

const PROFILE_IMAGE_STORAGE_KEY = "userProfileImage";
export const PROFILE_IMAGE_UPDATED_EVENT = "profileImageUpdated";

export const getProfileImageStorageKey = (userId?: number | null) =>
  userId ? `${PROFILE_IMAGE_STORAGE_KEY}:${userId}` : PROFILE_IMAGE_STORAGE_KEY;

export const readProfileImageFromStorage = (userId?: number | null) => {
  const storageKey = getProfileImageStorageKey(userId);
  const legacyKey = PROFILE_IMAGE_STORAGE_KEY;

  return (
    localStorage.getItem(storageKey) ||
    (!userId ? localStorage.getItem(legacyKey) : null)
  );
};

export const writeProfileImageToStorage = (
  userId?: number | null,
  profileImage?: string | null
) => {
  const storageKey = getProfileImageStorageKey(userId);
  const legacyKey = PROFILE_IMAGE_STORAGE_KEY;

  if (profileImage) {
    localStorage.setItem(storageKey, profileImage);
  } else {
    localStorage.removeItem(storageKey);
  }

  if (storageKey !== legacyKey) {
    localStorage.removeItem(legacyKey);
  }
};

export const notifyProfileImageUpdated = (
  detail: ProfileImageEventDetail
) => {
  window.dispatchEvent(
    new CustomEvent<ProfileImageEventDetail>(PROFILE_IMAGE_UPDATED_EVENT, {
      detail,
    })
  );
};

