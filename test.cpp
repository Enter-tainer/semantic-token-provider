#include <iostream>
#define qwq(a) (a + 1)
class Test {
  int a;
};

int main () {
  Test a;
  static volatile Test t;
  qwq(2);
}
