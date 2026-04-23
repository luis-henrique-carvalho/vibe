"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpIcon, Loader2Icon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import TextareaAutosize from "react-textarea-autosize";

interface Props {
  projectId: string;
}

const formSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { message: "Message is required" })
    .max(10000, { message: "Message is too long" }),
});

type FormValues = z.infer<typeof formSchema>;

export const MessageForm = ({ projectId }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      content: "",
    },
  });

  const createMessage = useMutation(
    trpc.messages.create.mutationOptions({
      onSuccess: () => {
        form.reset();
        void queryClient.invalidateQueries(
          trpc.messages.getAll.queryOptions({ projectId }),
        );
        void queryClient.invalidateQueries({
          queryKey: [["usage", "status"]],
        });
      },
      onError: (error) => {
        // TODO: Redirect to pricing page if specific error
        toast.error(error.message);
      },
    }),
  );

  const onSubmit = async (values: FormValues) => {
    await createMessage.mutateAsync({
      content: values.content,
      projectId,
    });
  };

  const [isFocused, setIsFocused] = useState(false);
  const isPending = createMessage.isPending;
  const isButtonDisabled = isPending || !form.formState.isValid;
  const showUsage = false;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn(
        "relative rounded-xl border bg-sidebar p-4 pt-1 transition-all",
        isFocused && "shadow-xs",
        showUsage && "rounded-t-none",
      )}
    >
      <Controller
        control={form.control}
        name="content"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="message-content" className="sr-only">
              Message
            </FieldLabel>
            <TextareaAutosize
              {...field}
              id="message-content"
              disabled={isPending}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              minRows={2}
              maxRows={8}
              className="pt-4 resize-none border-none w-full outline-none bg-transparent"
              placeholder="What would you like to build?"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  form.handleSubmit(onSubmit)(e);
                }
              }}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="flex items-end justify-between gap-2 pt-2">
        <div className="font-mono text-[10px] text-muted-foreground">
          <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span>&#8984;</span>Enter
          </kbd>
          &nbsp;to submit
        </div>
        <Button
          type="submit"
          size="icon-sm"
          aria-label={isPending ? "Sending message" : "Send message"}
          disabled={isButtonDisabled}
          className={cn("rounded-full", isButtonDisabled && "border")}
        >
          {isPending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <ArrowUpIcon />
          )}
        </Button>
      </div>
    </form>
  );
};
