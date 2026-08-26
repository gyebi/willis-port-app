
type ShipmentFieldsProps = {
  gridClassName: string;
  defaults?: {
    trackingNumber?: string;
    containerId?: string;
    shippingMode?: "SEA" | "AIR" | "UNKNOWN";
    serviceType?: "STANDARD" | "EXPRESS";
    goodsCategory?: "NORMAL" | "SPECIAL";
    goodsType?: string;
    dateReceived?: string;
    weightKg?: string;
    chargeableWeightKg?: string;
    declaredCbm?: string;
    actualCbm?: string;
    chargeableCbm?: string;
    description?: string;
  };
  containerOptions?: Array<{
    id: string;
    containerNumber: string;
    status: string;
  }>;
  includeMeasurements?: boolean;
  requireDateReceived?: boolean;
};

export default function ShipmentFields({
  gridClassName,
  defaults,
  containerOptions = [],
  includeMeasurements = true,
  requireDateReceived = false,
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
            <option value="AIR">Air</option>
            <option value="SEA">Sea</option>
            <option value="UNKNOWN">
              Not yet known
            </option>
          </select>
        </div>

        <div>
          <label htmlFor="containerId">
            Container
          </label>

          <select
            id="containerId"
            name="containerId"
            defaultValue={defaults?.containerId ?? ""}
          >
            <option value="">
              No container assigned
            </option>

            {containerOptions.map((container) => (
              <option
                key={container.id}
                value={container.id}
              >
                {container.containerNumber} ({container.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="serviceType">
            Service Type
          </label>

          <select
            id="serviceType"
            name="serviceType"
            required={!defaults?.serviceType}
            defaultValue={defaults?.serviceType ?? ""}
          >
            <option value="" disabled>
              Select service type
            </option>
            <option value="STANDARD">Standard</option>
            <option value="EXPRESS">Express</option>
          </select>
        </div>

        <div>
          <label htmlFor="goodsCategory">
            Goods Category
          </label>

          <select
            id="goodsCategory"
            name="goodsCategory"
            required={!defaults?.goodsCategory}
            defaultValue={defaults?.goodsCategory ?? ""}
          >
            <option value="" disabled>
              Select goods category
            </option>
            <option value="NORMAL">Normal</option>
            <option value="SPECIAL">Special</option>
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
            required={requireDateReceived}
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

        {includeMeasurements && (
          <div>
            <label htmlFor="chargeableWeightKg">
              Chargeable Weight (kg)
            </label>

            <input
              id="chargeableWeightKg"
              name="chargeableWeightKg"
              type="number"
              min="0"
              step="0.001"
              defaultValue={defaults?.chargeableWeightKg ?? ""}
            />
          </div>
        )}

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
