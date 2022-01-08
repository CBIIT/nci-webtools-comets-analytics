import { atom } from "recoil";

export const showTagManagerState = atom({
  key: "tagManager.showTagManagerState",
  default: false,
});

export const tagsState = atom({
  key: "tagManager.tagsState",
  default: [],
});

export const newTagLabelState = atom({
  key: "tagManager.newTagLabelState",
  default: "",
});

export const newTagValuesState = atom({
  key: "tagManager.newTagValuesState",
  default: [],
});
