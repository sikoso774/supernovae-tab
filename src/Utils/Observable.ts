type Subscriber<T> = (value: T) => void;

/**
 * An implementation of an Observable to subscribe to updates to a value
 */
class Observable<T extends object> {
	private value: T;
	private subscribers: Subscriber<T>[] = [];

	constructor(value: T) {
		this.value = value;
	}

	/**
	 * Set the value
	 * @param value
	 */
	setValue(value: T) {
		this.value = value;
		this.subscribers.forEach((callback) => callback({ ...this.value }));
	}

	/**
	 * Get the current value
	 */
	getValue(): T {
		return this.value;
	}

	/**
	 * Subscribe to changes in the value. Function returns a "unsubscribe" function to clean up as nessessary.
	 * @param callback
	 */
	onChange(callback: Subscriber<T>) {
		this.subscribers.push(callback);

		return () => {
			this.subscribers = this.subscribers.filter(
				(value) => value !== callback
			);
		};
	}
}

export default Observable;
