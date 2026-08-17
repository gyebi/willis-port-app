
type ShipmentFieldsProps = {
  gridClassName: string;
  defaults?: {
    trackingNumber?: string;
    shippingMode?: "SEA" | "AIR" | "UNKNOWN";
    goodsType?: string;
    dateReceived?: string;
    weightKg?: string;
    declaredCbm?: string;
    actualCbm?: string;
    chargeableCbm?: string;
    description?: string;
    
  };
  includeMeasurements?: boolean;
};

export default function ShipmentFields({
  gridClassName,
  defaults,
  includeMeasurements = false,
}: ShipmentFieldsProps) {
  return (
    <>
      <div className={gridClassName}>
        <div>
          <label htmlFor="trackingNumber">
            Tracking Number
          </label>

          <input
            id="trackingNumber"
            name="trackingNumber"
            type="text"
            defaultValue={defaults?.trackingNumber ?? ""}
          />
        </div>

        <div>
          <label htmlFor="shippingMode">
            Shipping Mode
          </label>

          <select
            id="shippingMode"
            name="shippingMode"
            defaultValue={defaults?.shippingMode ?? "UNKNOWN"}
          >
            <option value="UNKNOWN">
              Not yet known
            </option>

            <option value="SEA">Sea</option>
            <option value="AIR">Air</option>
          </select>
        </div>

        <div>
          <label htmlFor="goodsType">
            Goods Type
          </label>

          <input
            id="goodsType"
            name="goodsType"
            type="text"
            placeholder="Normal, Electronics..."
            defaultValue={defaults?.goodsType ?? ""}
          />
        </div>

        <div>
          <label htmlFor="dateReceived">
            Date Received
          </label>

          <input
            id="dateReceived"
            name="dateReceived"
            type="date"
            defaultValue={defaults?.dateReceived ?? ""}
          />
        </div>

        <div>
          <label htmlFor="weightKg">
            Weight (kg)
          </label>

          <input
            id="weightKg"
            name="weightKg"
            type="number"
            min="0"
            step="0.001"
            defaultValue={defaults?.weightKg ?? ""}
          />
        </div>

        <div>
          <label htmlFor="declaredCbm">
            Declared CBM
          </label>

          <input
            id="declaredCbm"
            name="declaredCbm"
            type="number"
            min="0"
            step="0.0001"
            defaultValue={defaults?.declaredCbm ?? ""}
          />
        </div>

        {includeMeasurements && (
          <>
            <div>
              <label htmlFor="actualCbm">
                Actual CBM
              </label>

              <input
                id="actualCbm"
                name="actualCbm"
                type="number"
                min="0"
                step="0.0001"
                defaultValue={defaults?.actualCbm ?? ""}
              />
            </div>

            <div>
              <label htmlFor="chargeableCbm">
                Chargeable CBM
              </label>

              <input
                id="chargeableCbm"
                name="chargeableCbm"
                type="number"
                min="0"
                step="0.0001"
                defaultValue={defaults?.chargeableCbm ?? ""}
              />
            </div>
          </>
        )}
      </div>

      <div>
        <label htmlFor="description">
          Description
        </label>

        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaults?.description ?? ""}
        />
      </div>
    </>
  );
}
