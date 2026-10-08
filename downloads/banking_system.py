import hashlib
import random
import sqlite3
import sys

# --- DATABASE SETUP ---
DB_NAME = "bank.db"


def init_db():
    """Initializes the SQLite database tables."""
    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        # Accounts Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS accounts (
                account_number INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                pin_hash TEXT NOT NULL,
                balance REAL DEFAULT 0.0
            )
        """
        )
        # Transactions Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_number INTEGER,
                type TEXT,
                amount REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_number) REFERENCES accounts (account_number)
            )
        """
        )
        conn.commit()


def hash_pin(pin: str) -> str:
    """Hashes a PIN string for secure storage."""
    return hashlib.sha256(pin.encode()).hexdigest()


# --- BANK SYSTEM CLASS ---
class BankSystem:

    def create_account(self, name: str, pin: str, initial_deposit: float):
        """Creates a new user account with a unique 6-digit account number."""
        if initial_deposit < 0:
            print("Initial deposit cannot be negative.")
            return

        acc_num = random.randint(100000, 999999)
        hashed_pin = hash_pin(pin)

        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(
                    "INSERT INTO accounts (account_number, name, pin_hash, balance) VALUES (?, ?, ?, ?)",
                    (acc_num, name, hashed_pin, initial_deposit),
                )
                if initial_deposit > 0:
                    cursor.execute(
                        "INSERT INTO transactions (account_number, type, amount) VALUES (?, ?, ?)",
                        (acc_num, "Initial Deposit", initial_deposit),
                    )
                conn.commit()
                print("\n" + "=" * 40)
                print(" ACCOUNT CREATED SUCCESSFULLY!")
                print(f" Account Holder: {name}")
                print(f" Account Number: {acc_num}")
                print(f" Initial Balance: ${initial_deposit:,.2f}")
                print("=" * 40)
            except sqlite3.IntegrityError:
                # Retry if random account number collision occurs
                self.create_account(name, pin, initial_deposit)

    def authenticate(self, acc_num: int, pin: str):
        """Authenticates user credentials."""
        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT pin_hash FROM accounts WHERE account_number = ?",
                (acc_num,),
            )
            result = cursor.fetchone()
            if result and result[0] == hash_pin(pin):
                return True
        return False

    def get_balance(self, acc_num: int) -> float:
        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT balance FROM accounts WHERE account_number = ?",
                (acc_num,),
            )
            return cursor.fetchone()[0]

    def deposit(self, acc_num: int, amount: float):
        if amount <= 0:
            print("Deposit amount must be positive.")
            return

        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE accounts SET balance = balance + ? WHERE account_number = ?",
                (amount, acc_num),
            )
            cursor.execute(
                "INSERT INTO transactions (account_number, type, amount) VALUES (?, ?, ?)",
                (acc_num, "Deposit", amount),
            )
            conn.commit()
            print(
                f"Successfully deposited ${amount:,.2f}. New Balance: ${self.get_balance(acc_num):,.2f}"
            )

    def withdraw(self, acc_num: int, amount: float):
        if amount <= 0:
            print("Withdrawal amount must be positive.")
            return

        current_balance = self.get_balance(acc_num)
        if amount > current_balance:
            print("Insufficient funds!")
            return

        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE accounts SET balance = balance - ? WHERE account_number = ?",
                (amount, acc_num),
            )
            cursor.execute(
                "INSERT INTO transactions (account_number, type, amount) VALUES (?, ?, ?)",
                (acc_num, "Withdrawal", -amount),
            )
            conn.commit()
            print(
                f"Successfully withdrew ${amount:,.2f}. Remaining Balance: ${self.get_balance(acc_num):,.2f}"
            )

    def transfer(self, sender_acc: int, target_acc: int, amount: float):
        if amount <= 0:
            print("Transfer amount must be positive.")
            return

        if sender_acc == target_acc:
            print("You cannot transfer money to yourself.")
            return

        current_balance = self.get_balance(sender_acc)
        if amount > current_balance:
            print("Insufficient funds!")
            return

        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()

            # Check if target account exists
            cursor.execute(
                "SELECT name FROM accounts WHERE account_number = ?",
                (target_acc,),
            )
            target = cursor.fetchone()
            if not target:
                print("Target account number does not exist.")
                return

            # Perform Transfer
            cursor.execute(
                "UPDATE accounts SET balance = balance - ? WHERE account_number = ?",
                (amount, sender_acc),
            )
            cursor.execute(
                "UPDATE accounts SET balance = balance + ? WHERE account_number = ?",
                (amount, target_acc),
            )

            # Log transactions
            cursor.execute(
                "INSERT INTO transactions (account_number, type, amount) VALUES (?, ?, ?)",
                (sender_acc, f"Transfer to Acc #{target_acc}", -amount),
            )
            cursor.execute(
                "INSERT INTO transactions (account_number, type, amount) VALUES (?, ?, ?)",
                (target_acc, f"Transfer from Acc #{sender_acc}", amount),
            )

            conn.commit()
            print(
                f"Successfully transferred ${amount:,.2f} to {target[0]} (Acc #{target_acc})."
            )

    def print_statement(self, acc_num: int):
        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT type, amount, timestamp FROM transactions WHERE account_number = ? ORDER BY timestamp DESC",
                (acc_num,),
            )
            records = cursor.fetchall()

            print("\n" + "=" * 50)
            print(f" TRANSACTION STATEMENT FOR ACCOUNT #{acc_num}")
            print("=" * 50)
            print(f"{'Type':<25} | {'Amount':<10} | {'Date/Time'}")
            print("-" * 50)
            for rec in records:
                print(f"{rec[0]:<25} | ${rec[1]:<9.2f} | {rec[2]}")
            print("-" * 50)


# --- INTERACTION CLI ---
def main():
    init_db()
    bank = BankSystem()

    while True:
        print("\n=== MINI BANKING SYSTEM ===")
        print("1. Create New Account")
        print("2. Login to Account")
        print("3. Exit")

        choice = input("Select an option (1-3): ").strip()

        if choice == "1":
            name = input("Enter full name: ").strip()
            pin = input("Set a 4-digit PIN: ").strip()
            try:
                deposit = float(input("Enter initial deposit: $"))
                bank.create_account(name, pin, deposit)
            except ValueError:
                print("Invalid amount entered.")

        elif choice == "2":
            try:
                acc_num = int(input("Enter Account Number: "))
                pin = input("Enter PIN: ").strip()

                if bank.authenticate(acc_num, pin):
                    print(f"\nWelcome back!")
                    # Account Dashboard Loop
                    while True:
                        print(f"\n--- Account #{acc_num} Dashboard ---")
                        print("1. Check Balance")
                        print("2. Deposit Funds")
                        print("3. Withdraw Funds")
                        print("4. Transfer Money")
                        print("5. View Statement")
                        print("6. Logout")

                        user_choice = input(
                            "Select an option (1-6): "
                        ).strip()

                        if user_choice == "1":
                            bal = bank.get_balance(acc_num)
                            print(f"\nCurrent Balance: ${bal:,.2f}")
                        elif user_choice == "2":
                            amt = float(input("Enter deposit amount: $"))
                            bank.deposit(acc_num, amt)
                        elif user_choice == "3":
                            amt = float(input("Enter withdrawal amount: $"))
                            bank.withdraw(acc_num, amt)
                        elif user_choice == "4":
                            target_acc = int(
                                input("Enter recipient Account Number: ")
                            )
                            amt = float(input("Enter transfer amount: $"))
                            bank.transfer(acc_num, target_acc, amt)
                        elif user_choice == "5":
                            bank.print_statement(acc_num)
                        elif user_choice == "6":
                            print("Logged out successfully.")
                            break
                        else:
                            print("Invalid selection.")
                else:
                    print("Invalid Account Number or PIN.")
            except ValueError:
                print("Invalid input format.")

        elif choice == "3":
            print("Thank you for using Mini Banking System. Goodbye!")
            sys.exit()
        else:
            print("Invalid option. Please try again.")


if __name__ == "__main__":
    main()
