import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { db } from "../firebase.config";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const normalizeUser = (uid, data) => {
  if (!data) return null;

  return {
    uid,
    ...data,
    // Only the boolean value true grants master access. Strings such as
    // "true" or truthy values cannot accidentally elevate a user.
    isMaster: data.isMaster === true,
  };
};

export const fetchUser = createAsyncThunk(
  "user/fetchUser",
  async (uid, thunkAPI) => {
    try {
      if (!uid) {
        throw new Error("A user ID is required to fetch a user profile.");
      }

      const userSnap = await getDoc(doc(db, "users", uid));

      return userSnap.exists()
        ? normalizeUser(uid, userSnap.data())
        : null;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch user.",
      );
    }
  },
  {
    // React StrictMode can run mount effects twice in development. Skip a
    // duplicate read when this same profile is already loading or loaded.
    condition: (uid, { getState }) => {
      const userState = getState()?.user;

      if (userState?.status === "loading" && userState?.requestedUid === uid) {
        return false;
      }

      if (
        userState?.status === "succeeded" &&
        userState?.userData?.uid === uid
      ) {
        return false;
      }

      return true;
    },
  },
);

export const updateUser = createAsyncThunk(
  "user/updateUser",
  async ({ uid, name, email }, thunkAPI) => {
    try {
      if (!uid) {
        throw new Error("A user ID is required to update a user profile.");
      }

      await updateDoc(doc(db, "users", uid), { name, email });
      return { name, email };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error instanceof Error ? error.message : "Failed to update user.",
      );
    }
  },
);

const initialState = {
  userData: null,
  isMaster: false,
  status: "idle",
  error: null,
  currentRequestId: null,
  requestedUid: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearUser() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.userData = null;
        state.isMaster = false;
        state.currentRequestId = action.meta.requestId;
        state.requestedUid = action.meta.arg;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;

        state.status = "succeeded";
        state.userData = action.payload;
        state.isMaster = action.payload?.isMaster === true;
        state.currentRequestId = null;
        state.requestedUid = null;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;

        state.status = "failed";
        state.userData = null;
        state.isMaster = false;
        state.error = action.payload ?? action.error.message;
        state.currentRequestId = null;
        state.requestedUid = null;
      })
      .addCase(updateUser.pending, (state) => {
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        if (state.userData) {
          state.userData.name = action.payload.name;
          state.userData.email = action.payload.email;
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.error = action.payload ?? action.error.message;
      });
  },
});

export const { clearUser } = userSlice.actions;
export default userSlice.reducer;
