// src/components/booking/BookingForm.tsx
// Matches Lesson 25 section 25.12. shadcn Field + React Hook Form Controller
// + Zod, with a real-time price preview driven by form.watch().
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCreateBooking } from "@/hooks/useBookings";
import { bookingSchema, type BookingFormData } from "@/schemas/bookingSchema";
import type { Room } from "@/types/room";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (end <= start) return 0;
  return Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);
}

interface BookingFormProps {
  room: Room;
}

function BookingForm({ room }: BookingFormProps) {
  const navigate = useNavigate();
  const { mutate: createBooking, isPending } = useCreateBooking();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      checkIn: "",
      checkOut: "",
      guests: 1,
      paymentMethod: "cod",
    },
  });

  // Real-time price preview
  const checkIn = form.watch("checkIn");
  const checkOut = form.watch("checkOut");
  const nights = useMemo(
    () => calcNights(checkIn, checkOut),
    [checkIn, checkOut]
  );
  const totalPrice = nights * room.price;

  const today = new Date().toISOString().split("T")[0];

  const onSubmit = (data: BookingFormData): void => {
    createBooking(
      {
        room: room._id,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guests: data.guests,
        paymentMethod: data.paymentMethod,
      },
      {
        onSuccess: () => navigate("/bookings"),
      }
    );
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-baseline gap-1">
          <span className="text-2xl">Rs{room.price}</span>
          <span className="text-muted-foreground text-sm font-normal">
            /night
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="checkIn"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Check-in</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="date"
                      min={today}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="checkOut"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Check-out</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="date"
                      min={checkIn || today}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <Controller
              name="guests"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Guests</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={1}
                    max={room.capacity}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Maximum {room.capacity} guests.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="paymentMethod"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Payment method</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Choose a payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Only Cash on Arrival for now. Lesson 26 adds
                          <SelectItem value="esewa">eSewa</SelectItem>
                          right here as its main frontend change. */}
                      <SelectItem value="cod">Cash on arrival</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          {/* Real-time price preview */}
          {nights > 0 && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>
                    Rs{room.price} × {nights} night{nights !== 1 ? "s" : ""}
                  </span>
                  <span>Rs{totalPrice}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>Rs{totalPrice}</span>
                </div>
              </div>
            </>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isPending}
          >
            {isPending ? "Booking..." : "Book Now"}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            Your booking will be sent to the owner for confirmation.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default BookingForm;
