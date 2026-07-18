import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { db } from "../firebase.config";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";

const getTicketCollection = ({ uid, isMaster }) => {
  if (isMaster) {
    return collection(db, "tickets");
  }

  if (!uid) {
    throw new Error("A user ID is required to load a user's tickets.");
  }

  return collection(db, "users", uid, "myTickets");
};

// Fetches the master ticket collection for master users and the authenticated
// user's myTickets collection for every other user.
export const fetchTickets = createAsyncThunk(
  "tickets/fetchTickets",
  async (payload = {}, thunkAPI) => {
    try {
      const userState = thunkAPI.getState()?.user;
      const uid = payload.uid ?? userState?.userData?.uid ?? null;
      const isMaster = payload.isMaster ?? userState?.isMaster === true;
      const source = isMaster ? "master" : "user";
      const snapshot = await getDocs(getTicketCollection({ uid, isMaster }));
      const tickets = snapshot.docs.map((ticketDoc) => ({
        id: ticketDoc.id,
        ...ticketDoc.data(),
      }));

      return {
        tickets,
        source,
        ownerUid: isMaster ? null : uid,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch tickets.",
      );
    }
  },
);

// Uses Redux user state by default so the same action deletes from the correct
// collection for both master and non-master users.
export const deleteTicket = createAsyncThunk(
  "tickets/deleteTicket",
  async (payload, thunkAPI) => {
    try {
      const options =
        typeof payload === "string" ? { ticketId: payload } : payload ?? {};
      const userState = thunkAPI.getState()?.user;
      const ticketId = options.ticketId;
      const uid = options.uid ?? userState?.userData?.uid ?? null;
      const isMaster = options.isMaster ?? userState?.isMaster === true;

      if (!ticketId) {
        throw new Error("A ticket ID is required to delete a ticket.");
      }

      if (!isMaster && !uid) {
        throw new Error("A user ID is required to delete a user's ticket.");
      }

      const ticketRef = isMaster
        ? doc(db, "tickets", ticketId)
        : doc(db, "users", uid, "myTickets", ticketId);

      await deleteDoc(ticketRef);

      return ticketId;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete ticket.",
      );
    }
  },
);

const initialState = {
  tickets: [],
  source: null,
  ownerUid: null,
  loading: false,
  error: null,
};

const ticketsSlice = createSlice({
  name: "tickets",
  initialState,
  reducers: {
    setTickets(state, action) {
      const payload = action.payload;

      if (Array.isArray(payload)) {
        state.tickets = payload;
      } else {
        state.tickets = payload?.tickets ?? [];
        state.source = payload?.source ?? state.source;
        state.ownerUid = payload?.ownerUid ?? null;
      }

      state.loading = false;
      state.error = null;
    },
    setTicketsError(state, action) {
      state.loading = false;
      state.error = action.payload ?? "Failed to load tickets.";
    },
    clearTickets() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTickets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTickets.fulfilled, (state, action) => {
        state.loading = false;
        state.tickets = action.payload.tickets;
        state.source = action.payload.source;
        state.ownerUid = action.payload.ownerUid;
      })
      .addCase(fetchTickets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? action.error.message;
      })
      .addCase(deleteTicket.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTicket.fulfilled, (state, action) => {
        state.loading = false;
        state.tickets = state.tickets.filter(
          (ticket) => ticket.id !== action.payload,
        );
      })
      .addCase(deleteTicket.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? action.error.message;
      });
  },
});

export const { clearTickets, setTickets, setTicketsError } =
  ticketsSlice.actions;
export default ticketsSlice.reducer;
