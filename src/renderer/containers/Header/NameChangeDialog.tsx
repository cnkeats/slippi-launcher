/** @jsx jsx */
import { css, jsx } from "@emotion/react";
import CircularProgress from "@material-ui/core/CircularProgress";
import TextField from "@material-ui/core/TextField";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { useToasts } from "react-toast-notifications";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useAccount } from "@/lib/hooks/useAccount";
import { useAsync } from "@/lib/hooks/useAsync";
import { changeDisplayName } from "@/lib/slippiBackend";
import { validateDisplayName } from "@/lib/validate";

export const NameChangeDialog: React.FC<{
  displayName: string;
  open: boolean;
  handleClose: () => void;
}> = ({ displayName, open, handleClose }) => {
  const { handleSubmit, watch, control } = useForm<{ displayName: string }>({ defaultValues: { displayName } });

  const name = watch("displayName");

  const setDisplayName = useAccount((store) => store.setDisplayName);
  const { addToast } = useToasts();

  const submitNameChange = useAsync(async () => {
    try {
      await changeDisplayName(name);
      setDisplayName(name);
    } catch (err) {
      console.error(err);
      addToast(err.message, { appearance: "error" });
    } finally {
      handleClose();
    }
  });

  const onFormSubmit = handleSubmit(() => void submitNameChange.execute());

  return (
    <div>
      <ConfirmationModal
        title="Edit display name"
        open={open}
        onClose={handleClose}
        closeOnSubmit={false}
        onSubmit={onFormSubmit}
        confirmProps={{
          disabled: submitNameChange.loading,
        }}
        confirmText={
          submitNameChange.loading ? (
            <span
              css={css`
                display: flex;
                align-items: center;
              `}
            >
              Loading
              <CircularProgress
                size={16}
                color="inherit"
                css={css`
                  margin-left: 10px;
                `}
              />
            </span>
          ) : (
            "Confirm"
          )
        }
      >
        <Controller
          name="displayName"
          control={control}
          defaultValue=""
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              label="Display Name"
              required={true}
              error={Boolean(error)}
              helperText={error ? error.message : undefined}
              autoFocus={true}
              inputProps={{
                maxLength: 15,
              }}
            />
          )}
          rules={{ validate: (val) => validateDisplayName(val.trim()) }}
        />
      </ConfirmationModal>
    </div>
  );
};
